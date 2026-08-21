# Utilizadores de domínio e propriedades

## Objetivo

O registo de autenticação técnica da aplicação continua a ser mantido na tabela `users`. Esta evolução cria a entidade de domínio **`usuarios`**, usada para representar as pessoas físicas proprietárias de propriedades rurais. A separação evita confundir sessão de acesso com dados de titularidade.

## Entidades e integridade

| Tabela | Chave | Campos principais | Responsabilidade |
|---|---|---|---|
| `usuarios` | `cpf` | CPF, nome, sexo, criador, datas de criação e atualização | Pessoa física vinculável a propriedades. |
| `usuario_propriedade` | CPF + identificador da propriedade | CPF do utilizador, identificador da propriedade e data de vínculo | Relação muitos-para-muitos entre utilizadores e propriedades. |
| `ruralProperties` | `id` | Mantém o titular técnico (`ownerId`) da conta autenticada | Protege a gestão operacional já existente. |

O CPF será normalizado para **11 dígitos**, validado pelo algoritmo de dígitos verificadores e usado como chave primária conforme solicitado. A interface apresentará o CPF mascarado, expondo apenas os últimos quatro dígitos nas listas e cartões.

## Regras de vínculo

Uma propriedade nova exige pelo menos um utilizador de domínio selecionado. A criação registra a propriedade e o vínculo inicial na mesma operação transacional. Depois do cadastro, é possível associar outros utilizadores da mesma conta à propriedade, sem remover os vínculos já existentes. Um mesmo utilizador pode estar vinculado a várias propriedades.

> Os lançamentos financeiros continuam vinculados à propriedade. Assim, múltiplos proprietários partilham a mesma visão financeira daquela propriedade sem duplicar os registros de caixa.
