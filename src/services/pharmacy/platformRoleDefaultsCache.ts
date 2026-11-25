import type { PlatformRoleDefault } from "../../types";

let platformRoleDefaults: PlatformRoleDefault[] = [];

export function setPlatformRoleDefaults(rows: PlatformRoleDefault[]) {
  platformRoleDefaults = [...rows];
}

export function getPlatformRoleDefaults(): PlatformRoleDefault[] {
  return platformRoleDefaults;
}

export function getPlatformRoleDefault(roleKey: string): PlatformRoleDefault | undefined {
  const key = roleKey.trim().toLowerCase();
  return platformRoleDefaults.find((row) => row.roleKey === key && row.isActive !== false);
}
