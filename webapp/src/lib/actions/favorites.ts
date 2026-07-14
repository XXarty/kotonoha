"use server";

import { requireUser } from "@/lib/auth/require-user";
import { getContentItem } from "@/lib/content/repository";
import { setFavorite } from "@/lib/db/queries";
import { z } from "zod";

const favoriteSchema = z.object({
  itemId: z.string().min(1).max(160),
  favorite: z.boolean(),
});

export async function setFavoriteAction(rawInput: z.input<typeof favoriteSchema>) {
  const input = favoriteSchema.parse(rawInput);
  const userId = await requireUser();
  const item = getContentItem(input.itemId);
  if (!item) throw new Error("content item not found");

  await setFavorite({
    userId,
    kind: item.kind,
    itemId: item.id,
    favorite: input.favorite,
  });
  return { favorite: input.favorite };
}
