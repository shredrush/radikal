import { validateProductionEnvironment } from "@/lib/env";

export function register() {
  validateProductionEnvironment();
}
