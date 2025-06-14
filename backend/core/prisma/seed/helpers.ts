/**
 * Helper utilities for seeding data
 */

// Helper function to get random array elements
export function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Helper function to get random number in range
export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get random float in range
export function getRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Name pools for generating random student names
export const MALE_FIRST_NAMES = [
  'Abebe',
  'Bekele',
  'Dawit',
  'Ephrem',
  'Fikru',
  'Girma',
  'Hailu',
  'Iskinder',
  'Jemal',
  'Kebede',
  'Lemma',
  'Melaku',
  'Negash',
  'Omer',
  'Petros',
  'Robel',
  'Samuel',
  'Tadesse',
  'Worku',
  'Yonas',
  'Zelalem',
  'Amanuel',
  'Berhanu',
  'Dereje',
  'Endalkachew',
  'Fasil',
  'Getachew',
  'Henok',
  'Ibrahim',
  'Kirubel',
  'Liya',
  'Mekonnen',
];

export const FEMALE_FIRST_NAMES = [
  'Abeba',
  'Bethlehem',
  'Desta',
  'Eden',
  'Feven',
  'Genet',
  'Hanna',
  'Rahel',
  'Jerusalem',
  'Kidist',
  'Liya',
  'Meron',
  'Nardos',
  'Rahel',
  'Sara',
  'Tigist',
  'Wubet',
  'Yordanos',
  'Zemenay',
  'Almaz',
  'Bezawit',
  'Dagmawit',
  'Eyerusalem',
  'Frehiwot',
  'Gelila',
  'Haregewoin',
  'Iman',
  'Konjit',
  'Lidya',
  'Mahlet',
];

export const LAST_NAMES = [
  'Abebe',
  'Bekele',
  'Chala',
  'Demeke',
  'Endale',
  'Fikadu',
  'Girma',
  'Hailu',
  'Ibrahim',
  'Jemal',
  'Kebede',
  'Lemma',
  'Megersa',
  'Negash',
  'Olana',
  'Petros',
  'Regassa',
  'Sahle',
  'Tadesse',
  'Umer',
  'Woldemariam',
  'Yilma',
  'Zeleke',
  'Assefa',
  'Bogale',
  'Desalegn',
  'Endalkachew',
  'Fantahun',
  'Gebre',
  'Haddis',
  'Iyasu',
];

// Function to get a random name
export function getRandomName(isFemale: boolean): {
  firstName: string;
  lastName: string;
} {
  const firstName = isFemale
    ? FEMALE_FIRST_NAMES[Math.floor(Math.random() * FEMALE_FIRST_NAMES.length)]
    : MALE_FIRST_NAMES[Math.floor(Math.random() * MALE_FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return { firstName, lastName };
}
