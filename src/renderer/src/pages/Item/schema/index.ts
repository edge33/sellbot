import { z } from 'zod';

export enum CATEGORY {
  // Motori
  CAR = '2',
  MOTORBIKE = '3',
  COMMERCIAL_VEHICLE = '4',
  CAR_ACCESSORIES = '5',
  BOAT = '22',
  CARAVAN = '34',
  MOTO_ACCESSORIES = '36',
  // Elettronica
  COMPUTER_SCIENCE = '10',
  AUDIO_VIDEO = '11',
  SMARTPHONES = '12',
  PHOTOGRAPHY = '40',
  VIDEOGAMES = '44',
  // Casa
  FURNITURE = '14',
  GARDEN = '15',
  APPLIANCES = '37',
  // Abbigliamento, Sports, Hobby
  CLOTHING = '16',
  CHILDREN = '17',
  MUSIC_FILM = '19',
  SPORTS = '20',
  COLLECTIBLES = '21',
  BOOKS = '38',
  MUSICAL_INSTRUMENTS = '39',
  BICYCLES = '41',
  // Animali
  PET_ACCESSORIES = '100'
}

export enum CONDITION {
  NEW = '0',
  AS_NEW = '1',
  OPTIMAL = '2',
  GOOD = '3',
  DAMAGED = '4'
}

export enum SIZE {
  SMALL = '1',
  MEDIUM = '2',
  LARGE = '3',
  X_LARGE = '4'
}

export const CATEGORIES_WITH_TYPE = [
  CATEGORY.COMPUTER_SCIENCE,
  CATEGORY.AUDIO_VIDEO,
  CATEGORY.SMARTPHONES
];

/**
 * CATEGORY
 * Informatica -> 10
 * Console e videogiochi -> 44
 * Audio e video -> 11
 * Fotografia -> 40
 * Telefonia 12
 */

export enum COMPUTER_SCIENCE_TYPE {
  NOTEBOOK = '0',
  DESKTOP = '1',
  ACCESSORIES = '2'
}

export enum AUDIO_VIDEO_TYPE {
  TV = '0',
  DVD_PLAYERS = '1',
  RADIO_STEREO = '2',
  MP3_PLAYERS = '3',
  MISC = '4'
}

export enum SMARTPHONES_TYPE {
  SMARTPHONES = '0',
  ACCESSORIES = '1',
  HOME_PHONE = '2'
}

const required = { message: 'Questo campo è obbligatorio' };
const minLength = (minLength: number): [number, { message: string }] => {
  return [
    minLength,
    {
      message: `Questo campo deve contenere almeno ${minLength} caratter${minLength > 1 ? 'i' : 'e'}`
    }
  ];
};

// Define the base fields shared across all categories
const baseItemSchema = {
  id: z.string().optional(),
  title: z.string(required).min(...minLength(5)),
  description: z.string(required).min(...minLength(15)),
  price: z.number(required).min(...minLength(1)),
  dimension: z.nativeEnum(SIZE),
  condition: z.nativeEnum(CONDITION),
  photos: z.array(z.string()).optional()
};

export const computerScienceCategory = z
  .object({
    category: z.literal(CATEGORY.COMPUTER_SCIENCE),
    type: z.nativeEnum(COMPUTER_SCIENCE_TYPE) // This field is required for this category
  })
  .merge(z.object(baseItemSchema));

const videoGamesCategory = z
  .object({
    category: z.literal(CATEGORY.VIDEOGAMES)
  })
  .merge(z.object(baseItemSchema));

const audioVideoCategory = z
  .object({
    category: z.literal(CATEGORY.AUDIO_VIDEO),
    type: z.string(required) // This field is required for this category
  })
  .merge(z.object(baseItemSchema));

const photographyCategory = z
  .object({
    category: z.literal(CATEGORY.PHOTOGRAPHY)
  })
  .merge(z.object(baseItemSchema));

const smartphoneCategory = z
  .object({
    category: z.literal(CATEGORY.SMARTPHONES),
    type: z.string(required) // This field is required for this category
  })
  .merge(z.object(baseItemSchema));

// Combine the schemas using a discriminated union on `category`
export const itemSchema = z.discriminatedUnion('category', [
  computerScienceCategory,
  videoGamesCategory,
  audioVideoCategory,
  photographyCategory,
  smartphoneCategory
]);
