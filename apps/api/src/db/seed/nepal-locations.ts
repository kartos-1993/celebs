/**
 * Nepal's administrative divisions, used to bootstrap delivery areas before a
 * courier location list has ever been synced.
 *
 * 7 provinces and 77 districts, per Schedule 4 of the constitution: 75 districts
 * before 2015, with Nawalparasi and Rukum each split in two. The district counts
 * below are the official ones and are asserted in the accompanying spec, because
 * a wrong or partial list here means a customer is shown a district that does
 * not exist, or is not offered one that does.
 *
 * This is reference data we hold, not a courier feed. A courier sync supersedes
 * it, and coverage for a bootstrap area is provisional until it does.
 */

export interface NepalProvince {
  name: string;
  districts: string[];
}

export const NEPAL_PROVINCES: readonly NepalProvince[] = [
  {
    name: 'Koshi',
    districts: [
      'Taplejung',
      'Panchthar',
      'Ilam',
      'Jhapa',
      'Tehrathum',
      'Sankhuwasabha',
      'Dhankuta',
      'Morang',
      'Sunsari',
      'Bhojpur',
      'Udayapur',
      'Khotang',
      'Solukhumbu',
      'Okhaldhunga',
    ],
  },
  {
    name: 'Madhesh',
    districts: [
      'Saptari',
      'Siraha',
      'Dhanusha',
      'Mahottari',
      'Sarlahi',
      'Rautahat',
      'Bara',
      'Parsa',
    ],
  },
  {
    name: 'Bagmati',
    districts: [
      'Dolakha',
      'Ramechhap',
      'Sindhuli',
      'Sindhupalchowk',
      'Kavrepalanchok',
      'Kathmandu',
      'Lalitpur',
      'Bhaktapur',
      'Rasuwa',
      'Nuwakot',
      'Makawanpur',
      'Dhading',
      'Chitwan',
    ],
  },
  {
    name: 'Gandaki',
    districts: [
      'Gorkha',
      'Lamjung',
      'Tanahun',
      'Nawalpur',
      'Manang',
      'Mustang',
      'Kaski',
      'Parbat',
      'Syangja',
      'Myagdi',
      'Baglung',
    ],
  },
  {
    name: 'Lumbini',
    districts: [
      'Parasi',
      'Palpa',
      'Gulmi',
      'Arghakhanchi',
      'Rupandehi',
      'Kapilvastu',
      'Pyuthan',
      'Eastern Rukum',
      'Rolpa',
      'Dang',
      'Banke',
      'Bardiya',
    ],
  },
  {
    name: 'Karnali',
    districts: [
      'Dolpa',
      'Mugu',
      'Humla',
      'Jumla',
      'Western Rukum',
      'Jajarkot',
      'Kalikot',
      'Dailekh',
      'Surkhet',
      'Salyan',
    ],
  },
  {
    name: 'Sudur Paschim',
    districts: [
      'Bajura',
      'Achham',
      'Bajhang',
      'Darchula',
      'Baitadi',
      'Dadeldhura',
      'Doti',
      'Kanchanpur',
      'Kailali',
    ],
  },
];

export const NEPAL_DISTRICT_COUNT = NEPAL_PROVINCES.reduce(
  (total, province) => total + province.districts.length,
  0,
);

/**
 * The Kathmandu Valley districts. A separate `Rukum` pair exists because the 2015
 * split left Eastern Rukum in Lumbini and Western Rukum in Karnali.
 */
export const VALLEY_DISTRICTS: ReadonlySet<string> = new Set([
  'Kathmandu',
  'Lalitpur',
  'Bhaktapur',
]);

/** Order subtotal at or above which delivery is free, inside the valley. */
export const valleyFreeDeliveryThreshold = 2500;

/** Order subtotal at or above which delivery is free, elsewhere in Nepal. */
export const outsideValleyFreeDeliveryThreshold = 5000;

export function districtsOf(provinceName: string): string[] {
  return NEPAL_PROVINCES.find((province) => province.name === provinceName)?.districts ?? [];
}

export function isValleyDistrict(districtName: string): boolean {
  return VALLEY_DISTRICTS.has(districtName);
}
