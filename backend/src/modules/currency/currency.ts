import type { Currency, Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client.js';

export type RateSnapshot = {
  usdToTry: number;
  eurToTry: number;
  tryToUsd: number;
  tryToEur: number;
  eurToUsd: number | null;
  usdToEur: number | null;
};

export async function getActiveRate(tx: Prisma.TransactionClient = prisma): Promise<RateSnapshot> {
  const rate = await tx.exchangeRate.findFirst({ where: { active: true }, orderBy: { effectiveDate: 'desc' } });
  if (!rate) {
    throw new Error('Aktif manuel kur bulunamadi. Kur Yonetimi ekranindan aktif kur girin.');
  }
  const usdToTry = Number(rate.usdToTry);
  const eurToTry = Number(rate.eurToTry);
  const tryToUsd = rate.tryToUsd == null ? 1 / usdToTry : Number(rate.tryToUsd);
  const tryToEur = rate.tryToEur == null ? 1 / eurToTry : Number(rate.tryToEur);
  const eurToUsd = rate.eurToUsd == null ? eurToTry / usdToTry : Number(rate.eurToUsd);
  const usdToEur = rate.usdToEur == null ? usdToTry / eurToTry : Number(rate.usdToEur);
  return {
    usdToTry,
    eurToTry,
    tryToUsd,
    tryToEur,
    eurToUsd,
    usdToEur,
  };
}

export function convertCurrency(amount: number, fromCurrency: Currency, toCurrency: Currency, rate: RateSnapshot) {
  if (fromCurrency === toCurrency) return { amount, rateUsed: 1 };
  const pairRate = rateForPair(fromCurrency, toCurrency, rate);
  return { amount: amount * pairRate, rateUsed: pairRate };
}

export function convertFromTry(amountTry: number, currency: Currency, rate: RateSnapshot) {
  return convertCurrency(amountTry, 'TRY', currency, rate).amount;
}

export function priceForCurrency(
  currency: Currency,
  prices: { tryPrice: unknown; usdPrice?: unknown; eurPrice?: unknown },
  rate: RateSnapshot,
) {
  if (currency === 'TRY') return { amount: Number(prices.tryPrice ?? 0), originalCurrency: 'TRY' as Currency, originalUnitPrice: Number(prices.tryPrice ?? 0), rateUsed: 1, converted: false };
  if (currency === 'USD' && prices.usdPrice != null) return { amount: Number(prices.usdPrice), originalCurrency: 'USD' as Currency, originalUnitPrice: Number(prices.usdPrice), rateUsed: 1, converted: false };
  if (currency === 'EUR' && prices.eurPrice != null) return { amount: Number(prices.eurPrice), originalCurrency: 'EUR' as Currency, originalUnitPrice: Number(prices.eurPrice), rateUsed: 1, converted: false };
  const originalUnitPrice = Number(prices.tryPrice ?? 0);
  const converted = convertCurrency(originalUnitPrice, 'TRY', currency, rate);
  return { amount: converted.amount, originalCurrency: 'TRY' as Currency, originalUnitPrice, rateUsed: converted.rateUsed, converted: true };
}

function rateForPair(fromCurrency: Currency, toCurrency: Currency, rate: RateSnapshot) {
  if (fromCurrency === 'USD' && toCurrency === 'TRY') return rate.usdToTry;
  if (fromCurrency === 'EUR' && toCurrency === 'TRY') return rate.eurToTry;
  if (fromCurrency === 'TRY' && toCurrency === 'USD') return rate.tryToUsd;
  if (fromCurrency === 'TRY' && toCurrency === 'EUR') return rate.tryToEur;
  if (fromCurrency === 'EUR' && toCurrency === 'USD') {
    if (!rate.eurToUsd) throw new Error('Aktif EUR -> USD kuru bulunamadi.');
    return rate.eurToUsd;
  }
  if (fromCurrency === 'USD' && toCurrency === 'EUR') {
    if (!rate.usdToEur) throw new Error('Aktif USD -> EUR kuru bulunamadi.');
    return rate.usdToEur;
  }
  throw new Error(`${fromCurrency} -> ${toCurrency} aktif kuru bulunamadi.`);
}
