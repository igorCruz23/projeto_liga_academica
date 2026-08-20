# Regra de remoção segura de propriedades

A ação apresentada como **Remover propriedade** realiza uma **inativação lógica**. A propriedade deixa de aparecer nas listas e deixa de participar de novos cálculos, mas os lançamentos financeiros já registados não são apagados. Esta decisão preserva o histórico económico e evita perdas de dados.

| Perfil ou função | Pode remover | Limite aplicado |
|---|---|---|
| Produtor, estudante ou consultor | Não | A ação não é apresentada e a API devolve acesso proibido se chamada diretamente. |
| Gestor | Sim | Apenas propriedades de que é titular. |
| Administrador (perfil) | Sim | Apenas propriedades de que é titular. |
| Administrador técnico do sistema | Sim | Pode inativar qualquer propriedade ativa. |

Antes da confirmação, a interface explica que os lançamentos serão preservados. No backend, a remoção atualiza apenas o campo `isActive` da propriedade para `false`; não há operação de exclusão na tabela de lançamentos financeiros.
