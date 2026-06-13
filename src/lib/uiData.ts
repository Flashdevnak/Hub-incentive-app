export const money = (v: any) => Number(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const monthName = (m: number) => ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'][Number(m)] || String(m);
export const appName = process.env.NEXT_PUBLIC_APP_NAME || 'NAK Incentive';
