# Arquitetura funcional — Liga Rural M.V.P.

O M.V.P. transforma cada utilizador autenticado num responsável por uma ou mais propriedades rurais. O perfil operacional é registado separadamente da função técnica de administração do sistema, preservando a possibilidade de evoluir as permissões sem misturar regras de negócio com a autenticação.

| Entidade | Finalidade | Dados principais |
|---|---|---|
| Perfil de utilizador | Identificar a perspetiva de uso do sistema. | Utilizador, perfil profissional e data de atualização. |
| Propriedade rural | Organizar os dados financeiros por exploração. | Proprietário, nome, localização, área, atividade principal e estado. |
| Lançamento financeiro | Registar entradas e saídas que alimentam o fluxo de caixa e resultados. | Propriedade, tipo, categoria, descrição, data, valor e autor. |

## Regras de cálculo

Todos os valores são persistidos com duas casas decimais e apresentados em reais. Um lançamento é associado obrigatoriamente a uma propriedade e a uma data de ocorrência.

| Indicador | Fórmula aplicada no M.V.P. |
|---|---|
| Saldo do fluxo de caixa | Receitas − custos de produção − despesas administrativas − impostos − deduções. |
| Lucro bruto | Receitas − custos diretamente associados à produção. |
| Lucro líquido | Receitas − custos de produção − despesas administrativas − impostos − deduções. |

Os filtros por dia, mês, trimestre e ano delimitam os lançamentos usados nos três cálculos. A seleção da propriedade limita os dados e os resultados apresentados ao respetivo titular autenticado.

## Limites deliberados do M.V.P.

O primeiro incremento concentra-se em receitas, saídas financeiras necessárias aos cálculos, consulta temporal e painel de resultados. Recursos como património, indicadores produtivos, importação de planilhas, exportações, relatórios e simulações de investimento permanecem fora do recorte inicial.
