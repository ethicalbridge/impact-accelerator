// Remove the member's profile photos through the Storage API before their auth
// account is deleted. Organisation logos live in a separate logos/ folder.
export async function removeAccountPhotos(storage, userId) {
  const { data, error } = await storage.list(userId, { limit: 1000 });
  if (error) throw error;
  if (data.length === 1000) throw Error("There are too many uploaded photos to delete automatically. Please contact support.");
  const paths = data
    .filter((item) => item.id && /\.(?:jpe?g|png|webp)$/i.test(item.name) && !item.name.includes("/"))
    .map((item) => `${userId}/${item.name}`);
  if (!paths.length) return;
  const removed = await storage.remove(paths);
  if (removed.error) throw removed.error;
}
