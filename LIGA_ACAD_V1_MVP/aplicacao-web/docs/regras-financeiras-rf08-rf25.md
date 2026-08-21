# Regras financeiras — RF08 a RF25

Este documento define o comportamento do incremento de fluxo de caixa e resultado económico do **Liga Rural**. As fórmulas são calculadas por propriedade, período e, quando escolhido, atividade produtiva.

## Classificação e estado dos lançamentos

| Elemento | Regra adotada |
|---|---|
| Tipos de lançamento | Receita, custo fixo, custo variável, custo de produção legado, despesa administrativa, imposto e dedução. |
| Categoria | Campo obrigatório, usado para identificar a natureza do lançamento. |
| Atividade | Campo obrigatório para novas movimentações, permitindo separar atividades produtivas. |
| Período | Determinado pela data de competência do lançamento (`occurredOn`). |
| Vencimento | Data opcional. Permite identificar pendências vencidas. |
| Estado | Receita pode estar recebida ou pendente; saídas podem estar pagas ou pendentes. Um lançamento pendente cujo vencimento é anterior ao dia atual é apresentado como vencido. |

## Base de cálculo

Os resultados económicos consideram todos os lançamentos do período pela data de competência. O saldo de caixa considera apenas os lançamentos já liquidados: receitas recebidas e saídas pagas. Assim, pendências e vencidos permanecem visíveis sem inflar o saldo disponível.

| Indicador | Fórmula |
|---|---|
| Receita total | Soma de todos os lançamentos do tipo receita. |
| Custo fixo | Soma de custos fixos. |
| Custo variável | Soma de custos variáveis, incluindo custos de produção do modelo anterior. |
| Custo total | Custos fixos + custos variáveis. |
| Lucro bruto | Receita total − custo total. |
| Lucro líquido | Lucro bruto − despesas administrativas − impostos − deduções. |
| Margem bruta | `(lucro bruto ÷ receita total) × 100`; indisponível quando não há receita. |
| Margem líquida | `(lucro líquido ÷ receita total) × 100`; indisponível quando não há receita. |
| Margem de contribuição | Receita total − custos variáveis. |
| Ponto de equilíbrio | `custos fixos ÷ (margem de contribuição ÷ receita total)`; indisponível quando a receita é zero ou a margem de contribuição não é positiva. |

## Comparação e atividades

Para cada período selecionado, o sistema calcula automaticamente a janela anterior equivalente. A comparação apresenta as variações absoluta e percentual da receita, do custo total, do lucro bruto e do lucro líquido.

Os lançamentos podem ser filtrados por atividade. A análise por atividade agrupa os mesmos indicadores por valor de atividade, sem misturar resultados entre atividades produtivas.

## Edição, exclusão e segurança

Um lançamento pode ser editado ou excluído apenas por quem tem titularidade sobre a propriedade vinculada. A exclusão remove exclusivamente o lançamento selecionado e exige confirmação na interface. Todas as consultas, alterações e exclusões verificam a propriedade antes da operação.
