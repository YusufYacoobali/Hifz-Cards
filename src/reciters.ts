export type Reciter = {
  id: string;
  name: string;
  folder: string;
};

export const defaultReciterId = "alafasy";

export const reciters: Reciter[] = [
  {
    id: "alafasy",
    name: "Mishary Alafasy",
    folder: "Alafasy_128kbps"
  },
  {
    id: "abdul-basit-murattal",
    name: "Abdul Basit Murattal",
    folder: "Abdul_Basit_Murattal_192kbps"
  },
  {
    id: "abdul-basit-mujawwad",
    name: "Abdul Basit Mujawwad",
    folder: "Abdul_Basit_Mujawwad_128kbps"
  },
  {
    id: "husary",
    name: "Mahmoud Khalil Al-Husary",
    folder: "Husary_128kbps"
  },
  {
    id: "husary-mujawwad",
    name: "Al-Husary Mujawwad",
    folder: "Husary_128kbps_Mujawwad"
  },
  {
    id: "minshawy",
    name: "Mohamed Siddiq Al-Minshawi",
    folder: "Minshawy_Murattal_128kbps"
  },
  {
    id: "minshawy-mujawwad",
    name: "Al-Minshawi Mujawwad",
    folder: "Minshawy_Mujawwad_192kbps"
  },
  {
    id: "sudais",
    name: "Abdul Rahman As-Sudais",
    folder: "Abdurrahmaan_As-Sudais_192kbps"
  },
  {
    id: "muaiqly",
    name: "Maher Al-Muaiqly",
    folder: "MaherAlMuaiqly128kbps"
  },
  {
    id: "shuraym",
    name: "Saud Ash-Shuraym",
    folder: "Saood_ash-Shuraym_128kbps"
  },
  {
    id: "shaatree",
    name: "Abu Bakr Ash-Shaatree",
    folder: "Abu_Bakr_Ash-Shaatree_128kbps"
  },
  {
    id: "dussary",
    name: "Yasser Ad-Dussary",
    folder: "Yasser_Ad-Dussary_128kbps"
  },
  {
    id: "hani-rifai",
    name: "Hani Ar-Rifai",
    folder: "Hani_Rifai_192kbps"
  },
  {
    id: "ajamy",
    name: "Ahmed Al-Ajamy",
    folder: "ahmed_ibn_ali_al_ajamy_128kbps"
  },
  {
    id: "budair",
    name: "Salah Al-Budair",
    folder: "Salah_Al_Budair_128kbps"
  },
  {
    id: "ayyoub",
    name: "Muhammad Ayyoub",
    folder: "Muhammad_Ayyoub_128kbps"
  }
];

export function reciterById(id?: string) {
  return reciters.find((reciter) => reciter.id === id) ?? reciters[0];
}
