// Modelo de Casbin (ADR-0002): RBAC simple, sin jerarquía; se niega lo que no está en la política.
export const MODELO = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = r.sub == p.sub && r.obj == p.obj && r.act == p.act
`;
