const PLACE_ID = 'ChIJ_Q6tIy2B9YgRZ4OdwB7z_KI';
const FIELD_MASK = [
  'rating',
  'userRatingCount',
  'reviews.rating',
  'reviews.text',
  'reviews.relativePublishTimeDescription',
  'reviews.authorAttribution',
  'reviews.googleMapsUri'
].join(',');

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
});

export default async function () {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return json({ error: 'GOOGLE_PLACES_API_KEY is not configured.' }, 503);

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=en`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK
      }
    });
    if (!response.ok) throw new Error(`Google Places returned ${response.status}`);

    const place = await response.json();
    const reviews = (place.reviews || []).map(review => ({
      name: review.authorAttribution?.displayName || 'Google reviewer',
      authorUri: review.authorAttribution?.uri || '',
      photoUri: review.authorAttribution?.photoUri || '',
      rating: review.rating || 5,
      text: review.text?.text || '',
      relativeTime: review.relativePublishTimeDescription || '',
      url: review.googleMapsUri || review.authorAttribution?.uri || ''
    })).filter(review => review.text);

    return json(
      { rating: place.rating, count: place.userRatingCount, reviews },
      200,
      { 'Cache-Control': 'public, max-age=3600, s-maxage=21600' }
    );
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Google Places request failed.' }, 502);
  }
}
