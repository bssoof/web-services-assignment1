export async function loadFamilies() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/families.json`);

  if (!response.ok) {
    throw new Error(`Failed to load family data: ${response.status}`);
  }

  return response.json();
}
