export async function loadVillages() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/villages.json`);

  if (!response.ok) {
    throw new Error(`Failed to load village data: ${response.status}`);
  }

  return response.json();
}
