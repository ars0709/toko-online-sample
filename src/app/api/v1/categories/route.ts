import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk } from "@/lib/api/response";
import { listCategories } from "@/server/services/catalog";

export const GET = withApi(
  async () => {
    const cats = await listCategories();
    return apiOk(cats);
  },
  { auth: "optional", rateTier: "generous" },
);

export { OPTIONS };
