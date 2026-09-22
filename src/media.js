import { db, state, result } from "./core.js";
export async function withImages(rows) {
  await Promise.all(
    rows.map(async (row) => {
      if (row.image?.startsWith("storage:")) {
        const { data, error } = await db.storage
          .from("accelerator-portfolio")
          .createSignedUrl(row.image.slice(8), 3600);
        row.imageURL = error ? "" : data.signedUrl;
      } else row.imageURL = row.image || "";
    }),
  );
  return rows;
}
export async function uploadImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Choose a JPEG, PNG or WebP image.");
  if (file.size > 5 * 1024 * 1024)
    throw Error("Choose an image smaller than 5 MB.");
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[
    file.type
  ];
  const path = `${state.user.id}/${crypto.randomUUID()}.${ext}`;
  await result(
    db.storage
      .from("accelerator-portfolio")
      .upload(path, file, { contentType: file.type, upsert: false }),
  );
  return "storage:" + path;
}
export async function removeImage(image) {
  if (image?.startsWith(`storage:${state.user.id}/`)) {
    const refs = await db.from("ia_portfolio").select("id").eq("image", image);
    if (refs.error || refs.data?.length) return;
    const { error } = await db.storage
      .from("accelerator-portfolio")
      .remove([image.slice(8)]);
    if (error) console.warn("An unused portfolio image could not be removed.");
  }
}
