import { LatLng } from '@/types';

export function buildNavigationUrl(target: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`;
}
