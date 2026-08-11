import { prisma } from '../db/prisma';
import { RuleType, StructuredKnowledgeRule } from '@prisma/client';

export interface ResolvedFactResult {
  intent: string;
  targetDate: Date;
  targetDateFormatted: string;
  isSummer: boolean;
  timeContext: 'morning' | 'afternoon' | 'full_day';
  activeRules: any[];
  overriddenRuleNames: string[];
  resolvedFactsText: string;
  isClosed: boolean;
  isDeterministicAnswerable: boolean;
  deterministicAnswer?: string | null;
}

/**
 * 1. CLASIFICACIÓN DE INTENCIÓN Y CONTEXTO TEMPORAL
 */
export function detectIntentAndContext(userQuestion: string, referenceDate: Date = new Date()): {
  intent: string;
  targetDate: Date;
  timeContext: 'morning' | 'afternoon' | 'full_day';
} {
  const q = userQuestion.toLowerCase();
  
  let intent = 'GENERAL_INQUIRY';
  if (q.includes('horario') || q.includes('abrir') || q.includes('abrís') || q.includes('abren') || q.includes('abierto') || q.includes('cerrado') || q.includes('festivo') || q.includes('tarde') || q.includes('mañana') || q.includes('domingo') || q.includes('sábado') || q.includes('lunes')) {
    intent = 'BUSINESS_HOURS';
  } else if (q.includes('precio') || q.includes('cuanto cuesta') || q.includes('cuánto cuesta') || q.includes('tarifa') || q.includes('descuento') || q.includes('promoción')) {
    intent = 'PRICING';
  } else if (q.includes('dónde') || q.includes('donde') || q.includes('ubicación') || q.includes('dirección') || q.includes('como llegar')) {
    intent = 'LOCATION';
  } else if (q.includes('pago') || q.includes('tarjeta') || q.includes('bizum') || q.includes('efectivo')) {
    intent = 'PAYMENT_METHOD';
  }

  const targetDate = new Date(referenceDate);

  if (q.includes('mañana') && !q.includes('por la mañana')) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (q.includes('pasado mañana')) {
    targetDate.setDate(targetDate.getDate() + 2);
  }

  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  for (let i = 0; i < monthNames.length; i++) {
    const month = monthNames[i];
    if (month && q.includes(month)) {
      const match = q.match(new RegExp(`(\\d{1,2})\\s*(de|/)?\\s*${month}`));
      if (match && match[1]) {
        const day = parseInt(match[1], 10);
        targetDate.setMonth(i);
        targetDate.setDate(day);
      }
    }
  }

  let timeContext: 'morning' | 'afternoon' | 'full_day' = 'full_day';
  if (q.includes('tarde') || q.includes('por la tarde')) {
    timeContext = 'afternoon';
  } else if (q.includes('mañana') && q.includes('por la mañana')) {
    timeContext = 'morning';
  }

  return { intent, targetDate, timeContext };
}

/**
 * 2. DETERMINACIÓN DE HECHOS Y JERARQUÍA DE PRIORIDADES
 */
export async function resolveApplicableFacts(
  commerceId: string, 
  userQuestion: string, 
  referenceDate: Date = new Date()
): Promise<ResolvedFactResult> {
  const { intent, targetDate, timeContext } = detectIntentAndContext(userQuestion, referenceDate);
  
  const daysOfWeekEs = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dayName = daysOfWeekEs[targetDate.getDay()] || 'día';
  const dateFormatted = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${targetDate.getDate()} de ${targetDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;

  const monthNumber = targetDate.getMonth() + 1; // 1-12
  const dayOfWeekNumber = targetDate.getDay() === 0 ? 7 : targetDate.getDay(); // 1=Mon, 7=Sun
  const isSummerMonth = monthNumber >= 6 && monthNumber <= 9;

  if (intent !== 'BUSINESS_HOURS' && intent !== 'PRICING' && intent !== 'LOCATION' && intent !== 'PAYMENT_METHOD') {
    return {
      intent,
      targetDate,
      targetDateFormatted: dateFormatted,
      isSummer: isSummerMonth,
      timeContext,
      activeRules: [],
      overriddenRuleNames: [],
      resolvedFactsText: '',
      isClosed: false,
      isDeterministicAnswerable: false,
      deterministicAnswer: null
    };
  }

  let rules = await prisma.structuredKnowledgeRule.findMany({
    where: { 
      commerceId,
      type: intent === 'BUSINESS_HOURS' ? { in: ['BUSINESS_HOURS', 'HOLIDAY_CLOSURE'] } : (intent as RuleType)
    },
    orderBy: { priority: 'desc' }
  });

  if (rules.length === 0 && intent === 'BUSINESS_HOURS') {
    rules = await seedDefaultBusinessRules(commerceId);
  }

  const matchingRules: StructuredKnowledgeRule[] = [];
  
  for (const rule of rules) {
    if (rule.specificDate) {
      const sDate = new Date(rule.specificDate);
      if (sDate.getFullYear() === targetDate.getFullYear() &&
          sDate.getMonth() === targetDate.getMonth() &&
          sDate.getDate() === targetDate.getDate()) {
        matchingRules.push(rule);
        continue;
      } else {
        continue;
      }
    }

    if (rule.validFrom && targetDate < new Date(rule.validFrom)) continue;
    if (rule.validUntil && targetDate > new Date(rule.validUntil)) continue;

    if (rule.monthsOfYear && rule.monthsOfYear.length > 0) {
      if (!rule.monthsOfYear.includes(monthNumber)) continue;
    }

    if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
      if (!rule.daysOfWeek.includes(dayOfWeekNumber)) continue;
    }

    matchingRules.push(rule);
  }

  matchingRules.sort((a, b) => b.priority - a.priority);

  const activeRules: StructuredKnowledgeRule[] = [];
  const overriddenRuleNames: string[] = [];

  for (const rule of matchingRules) {
    if (activeRules.length === 0) {
      activeRules.push(rule);
    } else {
      const topRule = activeRules[0];
      if (topRule && (topRule.isOverride || topRule.isClosed || topRule.priority > rule.priority)) {
        overriddenRuleNames.push(rule.name);
      } else {
        activeRules.push(rule);
      }
    }
  }

  let isClosed = false;
  let resolvedFactsText = '';
  let deterministicAnswer: string | null = null;

  if (activeRules.length > 0 && activeRules[0]) {
    const topRule = activeRules[0];

    if (topRule.isClosed) {
      isClosed = true;
      resolvedFactsText = `REGLA RESUELTA (${dateFormatted}): EL NEGOCIO ESTÁ CERRADO por ${topRule.name}. No hay servicio en ninguna franja horaria.`;
      deterministicAnswer = `El ${dateFormatted} estaremos cerrados por ${topRule.name.toLowerCase()}.`;
    } else {
      const payload: any = topRule.payload;
      const hoursList = payload?.hours || [];
      const hoursText = hoursList.map((h: any) => `${h.open} a ${h.close}`).join(' y de ');

      resolvedFactsText = `REGLA RESUELTA VIGENTE PARA ${dateFormatted.toUpperCase()}: ${topRule.name}. Horario aplicable: ${hoursText || 'Consultar'}. (${overriddenRuleNames.length > 0 ? `REGLAS ANULADAS Y NO VIGENTES: ${overriddenRuleNames.join(', ')}` : ''})`;

      if (timeContext === 'afternoon') {
        const afternoonFranja = hoursList.find((h: any) => parseInt(h.open.split(':')[0], 10) >= 14 || parseInt(h.close.split(':')[0], 10) >= 18);
        if (afternoonFranja) {
          deterministicAnswer = `Sí, en horario de ${topRule.name.toLowerCase()} por las tardes abrimos de ${afternoonFranja.open} a ${afternoonFranja.close}.`;
        } else {
          deterministicAnswer = `No, por las tardes no abrimos en horario de ${topRule.name.toLowerCase()}.`;
        }
      } else if (timeContext === 'morning') {
        const morningFranja = hoursList.find((h: any) => parseInt(h.open.split(':')[0], 10) < 14);
        if (morningFranja) {
          deterministicAnswer = `Sí, por las mañanas abrimos de ${morningFranja.open} a ${morningFranja.close}.`;
        } else {
          deterministicAnswer = `No, por las mañanas no abrimos.`;
        }
      } else {
        deterministicAnswer = `El horario vigente para ${dateFormatted} (${topRule.name.toLowerCase()}) es de ${hoursText}.`;
      }
    }
  }

  const isDeterministicAnswerable = intent === 'BUSINESS_HOURS' && activeRules.length > 0;

  return {
    intent,
    targetDate,
    targetDateFormatted: dateFormatted,
    isSummer: isSummerMonth,
    timeContext,
    activeRules,
    overriddenRuleNames,
    resolvedFactsText,
    isClosed,
    isDeterministicAnswerable,
    deterministicAnswer
  };
}

async function seedDefaultBusinessRules(commerceId: string) {
  const regularRule = await prisma.structuredKnowledgeRule.create({
    data: {
      commerceId,
      type: 'BUSINESS_HOURS',
      name: 'Horario habitual',
      priority: 100,
      daysOfWeek: [1, 2, 3, 4, 5],
      isOverride: false,
      payload: {
        hours: [{ open: '09:00', close: '20:00' }],
        note: 'De lunes a viernes en horario general'
      }
    }
  });

  const summerRule = await prisma.structuredKnowledgeRule.create({
    data: {
      commerceId,
      type: 'BUSINESS_HOURS',
      name: 'Horario de verano',
      priority: 300,
      monthsOfYear: [6, 7, 8, 9],
      daysOfWeek: [1, 2, 3, 4, 5],
      isOverride: true,
      payload: {
        hours: [
          { open: '09:00', close: '14:00' },
          { open: '19:30', close: '21:30' }
        ],
        note: 'Horario estacional de verano'
      }
    }
  });

  const holidayRule = await prisma.structuredKnowledgeRule.create({
    data: {
      commerceId,
      type: 'HOLIDAY_CLOSURE',
      name: 'Festivo 15 de Agosto',
      priority: 500,
      specificDate: new Date('2026-08-15T00:00:00.000Z'),
      isOverride: true,
      isClosed: true,
      payload: {
        hours: [],
        note: 'Cierre total por festivo nacional'
      }
    }
  });

  return [holidayRule, summerRule, regularRule];
}
