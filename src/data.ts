export type HifzCard = {
  num: number;
  prompt: string;
  full: string;
  tr: string;
  surah?: string;
  surahArabic?: string;
};

export type RevisionFlow = {
  start: number;
  label: string;
  surah?: number;
  passage: { num: number; text: string }[];
};

export const cards: HifzCard[] = [
  {
    num: 12,
    prompt: "إِنَّ ٱلَّذِينَ يَخْشَوْنَ رَبَّهُم بِٱلْغَيْبِ",
    full: "إِنَّ ٱلَّذِينَ يَخْشَوْنَ رَبَّهُم بِٱلْغَيْبِ لَهُم مَّغْفِرَةٌ وَأَجْرٌ كَبِيرٌ",
    tr: "Indeed, those who fear their Lord unseen will have forgiveness and great reward."
  },
  {
    num: 13,
    prompt: "وَأَسِرُّوا۟ قَوْلَكُمْ أَوِ ٱجْهَرُوا۟ بِهِ",
    full: "وَأَسِرُّوا۟ قَوْلَكُمْ أَوِ ٱجْهَرُوا۟ بِهِۦ ۖ إِنَّهُۥ عَلِيمٌۢ بِذَاتِ ٱلصُّدُورِ",
    tr: "And conceal your speech or publicize it; He knows what is within the breasts."
  },
  {
    num: 14,
    prompt: "أَلَا يَعْلَمُ مَنْ خَلَقَ",
    full: "أَلَا يَعْلَمُ مَنْ خَلَقَ وَهُوَ ٱللَّطِيفُ ٱلْخَبِيرُ",
    tr: "Does He who created not know, while He is the Subtle, the Acquainted?"
  },
  {
    num: 15,
    prompt: "هُوَ ٱلَّذِى جَعَلَ لَكُمُ ٱلْأَرْضَ ذَلُولًا",
    full: "هُوَ ٱلَّذِى جَعَلَ لَكُمُ ٱلْأَرْضَ ذَلُولًا فَٱمْشُوا۟ فِى مَنَاكِبِهَا وَكُلُوا۟ مِن رِّزْقِهِ",
    tr: "It is He who made the earth tame for you, so walk among its slopes and eat of His provision."
  },
  {
    num: 16,
    prompt: "ءَأَمِنتُم مَّن فِى ٱلسَّمَآءِ",
    full: "ءَأَمِنتُم مَّن فِى ٱلسَّمَآءِ أَن يَخْسِفَ بِكُمُ ٱلْأَرْضَ فَإِذَا هِىَ تَمُورُ",
    tr: "Do you feel secure that He would not cause the earth to swallow you while it shakes?"
  },
  {
    num: 17,
    prompt: "أَمْ أَمِنتُم مَّن فِى ٱلسَّمَآءِ",
    full: "أَمْ أَمِنتُم مَّن فِى ٱلسَّمَآءِ أَن يُرْسِلَ عَلَيْكُمْ حَاصِبًا ۖ فَسَتَعْلَمُونَ كَيْفَ نَذِيرِ",
    tr: "Or do you feel secure that He would not send a storm of stones? You will know My warning."
  },
  {
    num: 18,
    prompt: "وَلَقَدْ كَذَّبَ ٱلَّذِينَ مِن قَبْلِهِمْ",
    full: "وَلَقَدْ كَذَّبَ ٱلَّذِينَ مِن قَبْلِهِمْ فَكَيْفَ كَانَ نَكِيرِ",
    tr: "And already had those before them denied, so how terrible was My reproach."
  },
  {
    num: 19,
    prompt: "أَوَلَمْ يَرَوْا۟ إِلَى ٱلطَّيْرِ فَوْقَهُمْ",
    full: "أَوَلَمْ يَرَوْا۟ إِلَى ٱلطَّيْرِ فَوْقَهُمْ صَٰٓفَّٰتٍ وَيَقْبِضْنَ ۚ مَا يُمْسِكُهُنَّ إِلَّا ٱلرَّحْمَٰنُ",
    tr: "Do they not see the birds above them, spreading and folding their wings? None holds them but the Most Merciful."
  },
  {
    num: 20,
    prompt: "أَمَّنْ هَذَا ٱلَّذِى هُوَ جُندٌ لَّكُمْ",
    full: "أَمَّنْ هَذَا ٱلَّذِى هُوَ جُندٌ لَّكُمْ يَنصُرُكُم مِّن دُونِ ٱلرَّحْمَٰنِ",
    tr: "Who is it that could be an army for you to aid you other than the Most Merciful?"
  },
  {
    num: 21,
    prompt: "أَمَّنْ هَذَا ٱلَّذِى يَرْزُقُكُمْ",
    full: "أَمَّنْ هَذَا ٱلَّذِى يَرْزُقُكُمْ إِنْ أَمْسَكَ رِزْقَهُ ۚ بَل لَّجُّوا۟ فِى عُتُوٍّ وَنُفُورٍ",
    tr: "Who is it that could provide for you if He withheld His provision? Yet they persist in disdain."
  },
  {
    num: 22,
    prompt: "أَفَمَن يَمْشِى مُكِبًّا عَلَى وَجْهِهِ",
    full: "أَفَمَن يَمْشِى مُكِبًّا عَلَى وَجْهِهِۦٓ أَهْدَى أَمَّن يَمْشِى سَوِيًّا عَلَى صِرَٰطٍ مُّسْتَقِيمٍ",
    tr: "Is one who walks fallen on his face better guided, or one who walks upright on a straight path?"
  }
];

export const olderPassage = [
  { num: 1, text: "تَبَارَكَ ٱلَّذِى بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَىْءٍ قَدِيرٌ" },
  { num: 2, text: "ٱلَّذِى خَلَقَ ٱلْمَوْتَ وَٱلْحَيَوٰةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا" },
  { num: 3, text: "ٱلَّذِى خَلَقَ سَبْعَ سَمَٰوَٰتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِى خَلْقِ ٱلرَّحْمَٰنِ مِن تَفَٰوُتٍ" },
  { num: 4, text: "ثُمَّ ٱرْجِعِ ٱلْبَصَرَ كَرَّتَيْنِ يَنقَلِبْ إِلَيْكَ ٱلْبَصَرُ خَاسِئًا وَهُوَ حَسِيرٌ" },
  { num: 5, text: "وَلَقَدْ زَيَّنَّا ٱلسَّمَآءَ ٱلدُّنْيَا بِمَصَٰبِيحَ" }
];

export const newDeck = cards.filter((card) => [20, 21, 22].includes(card.num));

export const revisionFlows: RevisionFlow[] = [
  {
    start: 12,
    label: "Sūrah Al-Mulk · Āyāt 12-22",
    passage: cards.map((card) => ({ num: card.num, text: card.full }))
  },
  {
    start: 1,
    label: "Sūrah Al-Mulk · Āyāt 1-5",
    passage: olderPassage
  }
];

export const leaderboard = [
  { rank: 1, name: "Bilal", initial: "B", pts: 104, streak: 18, cards: 93, color: "#0f3b30" },
  { rank: 2, name: "Aisha", initial: "A", pts: 96, streak: 11, cards: 88, color: "#4e8a76" },
  { rank: 3, name: "You", initial: "Y", pts: 91, streak: 14, cards: 84, color: "#a87b25" },
  { rank: 4, name: "Hamza", initial: "H", pts: 77, streak: 8, cards: 71, color: "#8fc3b3" },
  { rank: 5, name: "Maryam", initial: "M", pts: 69, streak: 6, cards: 64, color: "#b07d28" }
];
