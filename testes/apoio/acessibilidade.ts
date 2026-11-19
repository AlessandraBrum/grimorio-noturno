import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export const REGRAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export async function conferirAcessibilidade(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(REGRAS_WCAG).analyze()
  const resumo = resultado.violations.map((falha) => ({
    regra: falha.id,
    nivel: falha.impact,
    problema: falha.help,
    onde: falha.nodes.map((no) => no.target.join(' ')),
  }))
  expect(resumo, 'Problemas de acessibilidade encontrados').toEqual([])
}
