const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const BASE_URL = 'http://localhost:3001';
const TOKEN = process.env.TEST_ADMIN_TOKEN || process.env.TEST_TOKEN || '';

if (!TOKEN) {
  console.error('TEST_ADMIN_TOKEN (or TEST_TOKEN) environment variable is required to run this script.');
  process.exit(1);
}

const authHeaders = () => ({
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
});

async function listImages() {
  const res = await fetch(`${BASE_URL}/api/content/images?limit=10&page=1`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`List images failed: ${res.status}`);
  return res.json();
}

async function listVideos() {
  const res = await fetch(`${BASE_URL}/api/content/videos?limit=10&page=1`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`List videos failed: ${res.status}`);
  return res.json();
}

async function deleteImages(imageIds, payload = {}) {
  const res = await fetch(`${BASE_URL}/api/content/images/bulk`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ imageIds, ...payload })
  });
  const data = await res.json();
  console.log('Image delete status:', res.status);
  console.log('Image delete response:', JSON.stringify(data, null, 2));
}

async function deleteVideos(videoIds, payload = {}) {
  const res = await fetch(`${BASE_URL}/api/content/videos/bulk`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ videoIds, ...payload })
  });
  const data = await res.json();
  console.log('Video delete status:', res.status);
  console.log('Video delete response:', JSON.stringify(data, null, 2));
}

(async () => {
  try {
    console.log('Fetching images...');
    const imagesData = await listImages();
    console.log('Images response:', JSON.stringify(imagesData, null, 2));
    const imagesList = imagesData?.images || imagesData?.data?.images || [];
    const imageSample = imagesList[0];
    const imageIds = imagesList.slice(0, 2).map(img => img.id);

    console.log('Fetching videos...');
    const videosData = await listVideos();
    console.log('Videos response:', JSON.stringify(videosData, null, 2));
    const videosList = videosData?.videos || videosData?.data?.videos || [];
    const videoSample = videosList[0];
    const videoIds = videosList.slice(0, 2).map(video => video.id);

    if (!imageIds.length && !videoIds.length) {
      console.log('No images or videos available for deletion.');
      return;
    }

    if (imageIds.length) {
      console.log('Deleting images:', imageIds);
      await deleteImages(imageIds, imageSample?.category ? { category: imageSample.category } : {});
    }

    if (videoIds.length) {
      console.log('Deleting videos:', videoIds);
      await deleteVideos(videoIds, videoSample?.category ? { category: videoSample.category } : {});
    }
  } catch (error) {
    console.error('Bulk delete test failed:', error.message || error);
  }
})();
