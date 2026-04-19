/**
 * Seeds the `questions` collection in Firestore (run after Firebase env is configured).
 * Usage: npx tsx scripts/seed-firestore.ts
 */
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../src/lib/firebase-admin";
import { defaultTopicFromPrompt } from "../src/lib/question-topic";
import type { Subject } from "../src/types/app";

type Row = {
  subject: Subject;
  topic: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIndex: number;
  targetYear: number;
  source: string;
};

type Q = {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

type GkQ = Q & { correct: "A" | "B" | "C" | "D" };

function gk(
  targetYear: number,
  list: Q & { correct: "A" | "B" | "C" | "D"; topic?: string },
): Row {
  const map = { A: 0, B: 1, C: 2, D: 3 } as const;
  const { correct, topic: topicOverride, ...rest } = list;
  return {
    subject: "GENERAL_KNOWLEDGE",
    targetYear,
    source: "seed",
    ...rest,
    topic: topicOverride ?? defaultTopicFromPrompt(rest.prompt),
    correctIndex: map[correct],
  };
}

function maths(
  targetYear: number,
  list: Q & { correct: "A" | "B" | "C" | "D"; topic?: string },
): Row {
  const map = { A: 0, B: 1, C: 2, D: 3 } as const;
  const { correct, topic: topicOverride, ...rest } = list;
  return {
    subject: "MATHS",
    targetYear,
    source: "seed",
    ...rest,
    topic: topicOverride ?? defaultTopicFromPrompt(rest.prompt),
    correctIndex: map[correct],
  };
}

/** Twenty unique GK seeds per year (P1–P7): animals, space, UK geography, history. */
function gkForYear(year: number): GkQ[] {
  switch (year) {
    case 1:
      return [
        {
          prompt: 'Which farm animal is famous for saying "moo"?',
          optionA: "Cow",
          optionB: "Pig",
          optionC: "Sheep",
          optionD: "Chicken",
          correct: "A",
        },
        {
          prompt: "How many legs does a dog usually have?",
          optionA: "2",
          optionB: "4",
          optionC: "6",
          optionD: "8",
          correct: "B",
        },
        {
          prompt: "What is a baby cat called?",
          optionA: "Puppy",
          optionB: "Kitten",
          optionC: "Chick",
          optionD: "Lamb",
          correct: "B",
        },
        {
          prompt: "Which bird cannot fly but is a strong swimmer?",
          optionA: "Eagle",
          optionB: "Owl",
          optionC: "Penguin",
          optionD: "Robin",
          correct: "C",
        },
        {
          prompt: "Elephants are known for their long…",
          optionA: "Wings",
          optionB: "Horns",
          optionC: "Neck",
          optionD: "Trunk",
          correct: "D",
        },
        {
          prompt: "Which planet do we live on?",
          optionA: "Mars",
          optionB: "The Moon",
          optionC: "Earth",
          optionD: "Venus",
          correct: "C",
        },
        {
          prompt: "What gives us daylight during the day?",
          optionA: "The Moon",
          optionB: "The Sun",
          optionC: "Stars",
          optionD: "Lightning",
          correct: "B",
        },
        {
          prompt: "How many planets orbit our Sun (in our solar system)?",
          optionA: "Seven",
          optionB: "Eight",
          optionC: "Nine",
          optionD: "Twelve",
          correct: "B",
        },
        {
          prompt: "Which planet is often called the Red Planet?",
          optionA: "Mars",
          optionB: "Jupiter",
          optionC: "Saturn",
          optionD: "Neptune",
          correct: "A",
        },
        {
          prompt: "At night, what tiny points of light can we see high in the sky?",
          optionA: "Kites",
          optionB: "Clouds",
          optionC: "Balloons",
          optionD: "Stars",
          correct: "D",
        },
        {
          prompt: "What is the capital city of England?",
          optionA: "Birmingham",
          optionB: "London",
          optionC: "Manchester",
          optionD: "Liverpool",
          correct: "B",
        },
        {
          prompt: "Which UK country has Edinburgh as its capital?",
          optionA: "Wales",
          optionB: "England",
          optionC: "Scotland",
          optionD: "Northern Ireland",
          correct: "C",
        },
        {
          prompt: "Which ocean lies to the west of Great Britain?",
          optionA: "Pacific",
          optionB: "Indian",
          optionC: "Arctic",
          optionD: "Atlantic",
          correct: "D",
        },
        {
          prompt: "Which river flows through London?",
          optionA: "Severn",
          optionB: "Thames",
          optionC: "Tay",
          optionD: "Mersey",
          correct: "B",
        },
        {
          prompt: "Which country shares a land border with Scotland?",
          optionA: "France",
          optionB: "Ireland",
          optionC: "England",
          optionD: "Norway",
          correct: "C",
        },
        {
          prompt: "What school subject is about people and events from the past?",
          optionA: "History",
          optionB: "Music",
          optionC: "Art",
          optionD: "PE",
          correct: "A",
        },
        {
          prompt: "On Bonfire Night, what do many families watch light up the sky?",
          optionA: "Snowballs",
          optionB: "Fireworks",
          optionC: "Kites",
          optionD: "Balloons",
          correct: "B",
        },
        {
          prompt: "Who is the head of state of the United Kingdom?",
          optionA: "The King",
          optionB: "The Mayor",
          optionC: "A judge",
          optionD: "A teacher",
          correct: "A",
        },
        {
          prompt: "Which saint is especially linked to Scotland?",
          optionA: "St George",
          optionB: "St David",
          optionC: "St Andrew",
          optionD: "St Patrick",
          correct: "C",
        },
        {
          prompt: "Which autumn festival is famous for pumpkins and dressing up?",
          optionA: "Christmas",
          optionB: "Easter",
          optionC: "Halloween",
          optionD: "Burns Night",
          correct: "C",
        },
      ];
    case 2:
      return [
        {
          prompt: "How many legs does a typical insect have?",
          optionA: "4",
          optionB: "6",
          optionC: "8",
          optionD: "10",
          correct: "B",
        },
        {
          prompt: "Which animal is the largest creature on Earth?",
          optionA: "Blue whale",
          optionB: "African elephant",
          optionC: "Giraffe",
          optionD: "Polar bear",
          correct: "A",
        },
        {
          prompt: "What do many caterpillars become when they grow up?",
          optionA: "Frogs",
          optionB: "Butterflies or moths",
          optionC: "Fish",
          optionD: "Birds",
          correct: "B",
        },
        {
          prompt: "Which mammal is the only one that can truly fly?",
          optionA: "Squirrel",
          optionB: "Bat",
          optionC: "Mouse",
          optionD: "Rabbit",
          correct: "B",
        },
        {
          prompt: "Where do most wild penguins live?",
          optionA: "Hot deserts",
          optionB: "Cold places near the sea ice",
          optionC: "High mountains in Scotland",
          optionD: "Tropical rainforests",
          correct: "B",
        },
        {
          prompt: "Which planet is closest to the Sun?",
          optionA: "Mercury",
          optionB: "Venus",
          optionC: "Earth",
          optionD: "Mars",
          correct: "A",
        },
        {
          prompt: "Which planet is the largest in our solar system?",
          optionA: "Saturn",
          optionB: "Jupiter",
          optionC: "Neptune",
          optionD: "Earth",
          correct: "B",
        },
        {
          prompt: "What do we call the curved path a planet takes around the Sun?",
          optionA: "Rotation",
          optionB: "Orbit",
          optionC: "Eclipse",
          optionD: "Phase",
          correct: "B",
        },
        {
          prompt: "Which planet is famous for its bright rings?",
          optionA: "Mars",
          optionB: "Venus",
          optionC: "Saturn",
          optionD: "Mercury",
          correct: "C",
        },
        {
          prompt: "The Moon is a natural… of Earth.",
          optionA: "Star",
          optionB: "Comet",
          optionC: "Satellite",
          optionD: "Planet",
          correct: "C",
        },
        {
          prompt: "What is the capital city of Wales?",
          optionA: "Swansea",
          optionB: "Cardiff",
          optionC: "Newport",
          optionD: "Bangor",
          correct: "B",
        },
        {
          prompt: "Which UK mountain range is home to Snowdon?",
          optionA: "Pennines",
          optionB: "Grampians",
          optionC: "Snowdonia",
          optionD: "Cairngorms",
          correct: "C",
        },
        {
          prompt: "Which sea lies between Great Britain and Ireland?",
          optionA: "North Sea",
          optionB: "Irish Sea",
          optionC: "English Channel",
          optionD: "Baltic Sea",
          correct: "B",
        },
        {
          prompt: "Which English city is strongly linked to The Beatles?",
          optionA: "Manchester",
          optionB: "Birmingham",
          optionC: "Liverpool",
          optionD: "Leeds",
          correct: "C",
        },
        {
          prompt: "The Orkney and Shetland islands are part of which UK nation?",
          optionA: "England",
          optionB: "Wales",
          optionC: "Northern Ireland",
          optionD: "Scotland",
          correct: "D",
        },
        {
          prompt: "Guy Fawkes is remembered for which failed plot?",
          optionA: "The Gunpowder Plot",
          optionB: "The Spanish Armada",
          optionC: "The Peasants' Revolt",
          optionD: "The Chartists",
          correct: "A",
        },
        {
          prompt: "Boudica led a rebellion against which powerful empire?",
          optionA: "Roman",
          optionB: "Viking",
          optionC: "Norman",
          optionD: "Tudor",
          correct: "A",
        },
        {
          prompt: "Which English queen is famous for supporting playwrights like Shakespeare?",
          optionA: "Queen Victoria",
          optionB: "Queen Elizabeth I",
          optionC: "Mary, Queen of Scots",
          optionD: "Queen Anne",
          correct: "B",
        },
        {
          prompt: "Which ancient stone circle stands on Salisbury Plain?",
          optionA: "Stonehenge",
          optionB: "Hadrian's Wall",
          optionC: "The Tower of London",
          optionD: "Edinburgh Castle",
          correct: "A",
        },
        {
          prompt: "The Vikings came from northern Europe — which direction from Britain is that?",
          optionA: "South",
          optionB: "North and east across the sea",
          optionC: "Straight west",
          optionD: "Directly south-west",
          correct: "B",
        },
      ];
    case 3:
      return [
        {
          prompt: "Which animal group has scales and lays eggs on land (like snakes)?",
          optionA: "Amphibians",
          optionB: "Reptiles",
          optionC: "Mammals",
          optionD: "Fish",
          correct: "B",
        },
        {
          prompt: "What do we call animals that eat only plants?",
          optionA: "Carnivores",
          optionB: "Herbivores",
          optionC: "Omnivores",
          optionD: "Insectivores",
          correct: "B",
        },
        {
          prompt:
            "Which common UK garden bird is often pictured on Christmas cards with a red breast?",
          optionA: "Blackbird",
          optionB: "Crow",
          optionC: "Robin",
          optionD: "House sparrow",
          correct: "C",
        },
        {
          prompt: "Which sea creature has eight arms and squirts ink?",
          optionA: "Jellyfish",
          optionB: "Starfish",
          optionC: "Octopus",
          optionD: "Seal",
          correct: "C",
        },
        {
          prompt: "Deer shed and regrow their… each year.",
          optionA: "Hooves",
          optionB: "Antlers",
          optionC: "Tails",
          optionD: "Stripes",
          correct: "B",
        },
        {
          prompt: "Which planet is famous for being tilted so it rolls along its orbit?",
          optionA: "Mars",
          optionB: "Venus",
          optionC: "Uranus",
          optionD: "Mercury",
          correct: "C",
        },
        {
          prompt: "What is the name of the galaxy that contains our solar system?",
          optionA: "Andromeda",
          optionB: "Milky Way",
          optionC: "Sombrero",
          optionD: "Whirlpool",
          correct: "B",
        },
        {
          prompt: "What sits at the centre of our solar system?",
          optionA: "Earth",
          optionB: "The Moon",
          optionC: "The Sun",
          optionD: "Jupiter",
          correct: "C",
        },
        {
          prompt: "Which planet is known for its Great Red Spot storm?",
          optionA: "Saturn",
          optionB: "Neptune",
          optionC: "Jupiter",
          optionD: "Uranus",
          correct: "C",
        },
        {
          prompt: "Roughly how long does Earth take to orbit the Sun once?",
          optionA: "One day",
          optionB: "One month",
          optionC: "One year",
          optionD: "One week",
          correct: "C",
        },
        {
          prompt: "Which UK city hosts the Welsh Parliament (Senedd)?",
          optionA: "Swansea",
          optionB: "Cardiff",
          optionC: "Wrexham",
          optionD: "Aberystwyth",
          correct: "B",
        },
        {
          prompt: "Which national park in England is famous for lakes and fells?",
          optionA: "Peak District",
          optionB: "Lake District",
          optionC: "New Forest",
          optionD: "Dartmoor",
          correct: "B",
        },
        {
          prompt: "Which strait separates Great Britain from northern France?",
          optionA: "North Channel",
          optionB: "Irish Sea",
          optionC: "English Channel",
          optionD: "Strait of Dover only",
          correct: "C",
        },
        {
          prompt: "Which UK capital city stands on the River Clyde?",
          optionA: "Edinburgh",
          optionB: "Aberdeen",
          optionC: "Glasgow",
          optionD: "Dundee",
          correct: "C",
        },
        {
          prompt: "Which range forms much of the border between England and Scotland?",
          optionA: "Pennines",
          optionB: "Cheviot Hills",
          optionC: "Cotswolds",
          optionD: "Chilterns",
          correct: "B",
        },
        {
          prompt: "In 1666, which disaster destroyed much of London?",
          optionA: "The Great Flood",
          optionB: "The Great Fire of London",
          optionC: "The Great Storm",
          optionD: "The Great Snow",
          correct: "B",
        },
        {
          prompt: "Henry VIII is remembered for having how many wives?",
          optionA: "Four",
          optionB: "Five",
          optionC: "Six",
          optionD: "Seven",
          correct: "C",
        },
        {
          prompt: "Which Scottish king defeated Macbeth in Shakespeare's play (and in legend)?",
          optionA: "Robert the Bruce",
          optionB: "Malcolm",
          optionC: "James VI",
          optionD: "William Wallace",
          correct: "B",
        },
        {
          prompt: "Which wall did the Romans build across northern Britain?",
          optionA: "Antonine Wall only",
          optionB: "Hadrian's Wall",
          optionC: "Offa's Dyke",
          optionD: "London Wall only",
          correct: "B",
        },
        {
          prompt: "During which queen's long reign did railways and factories spread fast?",
          optionA: "Elizabeth I",
          optionB: "Victoria",
          optionC: "Mary I",
          optionD: "Anne",
          correct: "B",
        },
      ];
    case 4:
      return [
        {
          prompt: "Which animal is a marsupial (carries young in a pouch)?",
          optionA: "Badger",
          optionB: "Kangaroo",
          optionC: "Fox",
          optionD: "Hedgehog",
          correct: "B",
        },
        {
          prompt: "What do bees collect from flowers to make honey?",
          optionA: "Water",
          optionB: "Nectar",
          optionC: "Leaves",
          optionD: "Sand",
          correct: "B",
        },
        {
          prompt: "Which big cat is the largest living cat species?",
          optionA: "Lion",
          optionB: "Tiger",
          optionC: "Leopard",
          optionD: "Cheetah",
          correct: "B",
        },
        {
          prompt: "Salmon are famous for swimming upstream to…",
          optionA: "Hibernate",
          optionB: "Spawn (lay eggs)",
          optionC: "Migrate to deserts",
          optionD: "Grow feathers",
          correct: "B",
        },
        {
          prompt: "Which bird is the UK's national bird (often shown on logos)?",
          optionA: "Swan",
          optionB: "Robin",
          optionC: "Puffin",
          optionD: "Eagle",
          correct: "B",
        },
        {
          prompt: "Which planet has the strongest winds in the solar system (measured)?",
          optionA: "Jupiter",
          optionB: "Saturn",
          optionC: "Neptune",
          optionD: "Mars",
          correct: "C",
        },
        {
          prompt: "What is a shooting star in the night sky usually?",
          optionA: "A distant aeroplane",
          optionB: "A meteor burning up",
          optionC: "A planet exploding",
          optionD: "A satellite photo",
          correct: "B",
        },
        {
          prompt: "Which planet is slightly tipped, like a rolling ball?",
          optionA: "Earth",
          optionB: "Venus",
          optionC: "Uranus",
          optionD: "Mercury",
          correct: "C",
        },
        {
          prompt: "What is the name of Earth's natural satellite?",
          optionA: "Phobos",
          optionB: "Titan",
          optionC: "The Moon",
          optionD: "Europa",
          correct: "C",
        },
        {
          prompt: "Roughly how long does the Moon take to orbit Earth?",
          optionA: "About a day",
          optionB: "About a week",
          optionC: "About a month",
          optionD: "About a year",
          correct: "C",
        },
        {
          prompt: "Which UK city is famous for its historic Roman baths?",
          optionA: "York",
          optionB: "Bath",
          optionC: "Chester",
          optionD: "Canterbury",
          correct: "B",
        },
        {
          prompt: "Which English county is known as the \"Garden of England\"?",
          optionA: "Devon",
          optionB: "Cornwall",
          optionC: "Kent",
          optionD: "Norfolk",
          correct: "C",
        },
        {
          prompt: "Which mountain is the highest in Wales?",
          optionA: "Ben Nevis",
          optionB: "Scafell Pike",
          optionC: "Snowdon (Yr Wyddfa)",
          optionD: "Slieve Donard",
          correct: "C",
        },
        {
          prompt: "Which UK city is built around an extinct volcano (Arthur's Seat)?",
          optionA: "Glasgow",
          optionB: "Edinburgh",
          optionC: "Stirling",
          optionD: "Perth",
          correct: "B",
        },
        {
          prompt: "Which island is the largest in the British Isles?",
          optionA: "Ireland",
          optionB: "Great Britain",
          optionC: "Isle of Man",
          optionD: "Anglesey",
          correct: "B",
        },
        {
          prompt: "In 1066, which battle is linked to William the Conqueror?",
          optionA: "Bannockburn",
          optionB: "Hastings",
          optionC: "Agincourt",
          optionD: "Waterloo",
          correct: "B",
        },
        {
          prompt: "Which English king is famous for having six wives?",
          optionA: "Henry VIII",
          optionB: "Henry V",
          optionC: "Richard III",
          optionD: "Charles I",
          correct: "A",
        },
        {
          prompt: "Mary, Queen of Scots, was eventually executed on whose orders?",
          optionA: "Mary I of England",
          optionB: "Elizabeth I",
          optionC: "James VI of Scotland",
          optionD: "Philip II of Spain",
          correct: "B",
        },
        {
          prompt: "Which engineer built the Clifton Suspension Bridge in Bristol?",
          optionA: "George Stephenson",
          optionB: "Isambard Kingdom Brunel",
          optionC: "James Watt",
          optionD: "Thomas Telford",
          correct: "B",
        },
        {
          prompt: "The Industrial Revolution began in Britain mainly using power from…",
          optionA: "Solar panels",
          optionB: "Steam engines",
          optionC: "Nuclear plants",
          optionD: "Wind turbines",
          correct: "B",
        },
      ];
    case 5:
      return [
        {
          prompt: "Which animal is the world's fastest land mammal?",
          optionA: "Lion",
          optionB: "Cheetah",
          optionC: "Horse",
          optionD: "Greyhound",
          correct: "B",
        },
        {
          prompt: "What do we call animals active mainly at dawn and dusk?",
          optionA: "Nocturnal",
          optionB: "Crepuscular",
          optionC: "Diurnal",
          optionD: "Arboreal",
          correct: "B",
        },
        {
          prompt: "Which mammal lays eggs (like the platypus)?",
          optionA: "Bat",
          optionB: "Echidna",
          optionC: "Shrew",
          optionD: "Otter",
          correct: "B",
        },
        {
          prompt: "Coral reefs are built mostly by tiny…",
          optionA: "Fish",
          optionB: "Coral animals (polyps)",
          optionC: "Seaweed",
          optionD: "Crabs",
          correct: "B",
        },
        {
          prompt: "Which UK mammal hibernates through winter in a cosy nest?",
          optionA: "Fox",
          optionB: "Hedgehog",
          optionC: "Rabbit",
          optionD: "Squirrel",
          correct: "B",
        },
        {
          prompt: "Which planet has a day longer than its year (odd rotation)?",
          optionA: "Mercury",
          optionB: "Venus",
          optionC: "Mars",
          optionD: "Jupiter",
          correct: "B",
        },
        {
          prompt: "What is a comet mostly made of?",
          optionA: "Liquid metal",
          optionB: "Ice, dust, and rock",
          optionC: "Pure gold",
          optionD: "Hot lava only",
          correct: "B",
        },
        {
          prompt: "Which planet has the Great Dark Spot (a huge storm)?",
          optionA: "Jupiter",
          optionB: "Saturn",
          optionC: "Neptune",
          optionD: "Uranus",
          correct: "C",
        },
        {
          prompt: "What causes seasons on Earth?",
          optionA: "The Moon blocking the Sun",
          optionB: "Earth's tilt as it orbits the Sun",
          optionC: "The Sun moving around Earth",
          optionD: "Random weather",
          correct: "B",
        },
        {
          prompt: "Roughly how old is our solar system?",
          optionA: "4.6 billion years",
          optionB: "6,000 years",
          optionC: "1 million years",
          optionD: "100 billion years",
          correct: "A",
        },
        {
          prompt: "Which UK city is nicknamed the \"Steel City\"?",
          optionA: "Sheffield",
          optionB: "Birmingham",
          optionC: "Newcastle",
          optionD: "Portsmouth",
          correct: "A",
        },
        {
          prompt: "Which river is the longest in the UK?",
          optionA: "Thames",
          optionB: "Severn",
          optionC: "Trent",
          optionD: "Wye",
          correct: "B",
        },
        {
          prompt: "Which English city was a major cotton-industry centre in the 1800s?",
          optionA: "Leeds",
          optionB: "Manchester",
          optionC: "Oxford",
          optionD: "Cambridge",
          correct: "B",
        },
        {
          prompt: "Which Scottish loch is famous for a legendary monster story?",
          optionA: "Loch Lomond",
          optionB: "Loch Ness",
          optionC: "Loch Tay",
          optionD: "Loch Katrine",
          correct: "B",
        },
        {
          prompt: "Which UK country has the Giant's Causeway as a famous landmark?",
          optionA: "Scotland",
          optionB: "Wales",
          optionC: "England",
          optionD: "Northern Ireland",
          correct: "D",
        },
        {
          prompt: "Which document limited the English king's power in 1215?",
          optionA: "Domesday Book",
          optionB: "Magna Carta",
          optionC: "Bill of Rights 1689",
          optionD: "Act of Union 1707",
          correct: "B",
        },
        {
          prompt: "Which battle in 1314 is a famous Scottish victory over England?",
          optionA: "Flodden",
          optionB: "Bannockburn",
          optionC: "Culloden",
          optionD: "Pinkie",
          correct: "B",
        },
        {
          prompt: "Which disease killed many people in Britain in 1348–49?",
          optionA: "Cholera",
          optionB: "Smallpox",
          optionC: "The Black Death (bubonic plague)",
          optionD: "Spanish flu",
          correct: "C",
        },
        {
          prompt: "Which explorer is strongly linked to ships called Golden Hind and circumnavigation?",
          optionA: "Captain Cook",
          optionB: "Sir Francis Drake",
          optionC: "John Cabot",
          optionD: "Walter Raleigh",
          correct: "B",
        },
        {
          prompt: "The Houses of Parliament in London are officially called…",
          optionA: "Westminster Palace",
          optionB: "Buckingham Palace",
          optionC: "St James's Palace",
          optionD: "Kensington Palace",
          correct: "A",
        },
      ];
    case 6:
      return [
        {
          prompt: "Which animal has the largest brain on Earth?",
          optionA: "African elephant",
          optionB: "Sperm whale",
          optionC: "Blue whale",
          optionD: "Human",
          correct: "B",
        },
        {
          prompt: "Photosynthesis mainly happens in which part of a plant?",
          optionA: "Roots",
          optionB: "Leaves",
          optionC: "Stem only",
          optionD: "Flowers only",
          correct: "B",
        },
        {
          prompt: "Which bird can fly backwards?",
          optionA: "Eagle",
          optionB: "Hummingbird",
          optionC: "Albatross",
          optionD: "Swift",
          correct: "B",
        },
        {
          prompt: "What is the top predator in many UK freshwater food chains?",
          optionA: "Minnow",
          optionB: "Pike",
          optionC: "Tadpole",
          optionD: "Duck",
          correct: "B",
        },
        {
          prompt: "Which animal is an arachnid (eight legs), not an insect?",
          optionA: "Ant",
          optionB: "Spider",
          optionC: "Beetle",
          optionD: "Bee",
          correct: "B",
        },
        {
          prompt:
            "Which gas giant is famous for the Great Red Spot and for having dozens of moons?",
          optionA: "Jupiter",
          optionB: "Saturn",
          optionC: "Uranus",
          optionD: "Neptune",
          correct: "A",
        },
        {
          prompt: "What is a light-year a measure of?",
          optionA: "Time only",
          optionB: "Distance",
          optionC: "Brightness",
          optionD: "Weight",
          correct: "B",
        },
        {
          prompt: "Which planet is sometimes called Earth's \"sister planet\" (similar size)?",
          optionA: "Mars",
          optionB: "Venus",
          optionC: "Mercury",
          optionD: "Jupiter",
          correct: "B",
        },
        {
          prompt: "What is the Sun mainly made of?",
          optionA: "Rock and metal",
          optionB: "Hydrogen and helium gas",
          optionC: "Water ice",
          optionD: "Solid iron only",
          correct: "B",
        },
        {
          prompt: "Which dwarf planet used to be called the ninth planet?",
          optionA: "Ceres",
          optionB: "Pluto",
          optionC: "Eris",
          optionD: "Haumea",
          correct: "B",
        },
        {
          prompt: "Which UK city is famous for the Clifton Suspension Bridge and SS Great Britain?",
          optionA: "Plymouth",
          optionB: "Bristol",
          optionC: "Southampton",
          optionD: "Portsmouth",
          correct: "B",
        },
        {
          prompt: "Which Scottish island chain is known as the \"Outer\" group west of the mainland?",
          optionA: "Orkney",
          optionB: "Outer Hebrides",
          optionC: "Shetland",
          optionD: "Skye only",
          correct: "B",
        },
        {
          prompt: "Which English city stands where the rivers Irwell and Medlock meet?",
          optionA: "Leeds",
          optionB: "Manchester",
          optionC: "Liverpool",
          optionD: "Sheffield",
          correct: "B",
        },
        {
          prompt: "Which Welsh city was once the world's biggest coal-export port?",
          optionA: "Cardiff",
          optionB: "Swansea",
          optionC: "Newport",
          optionD: "Merthyr Tydfil",
          correct: "A",
        },
        {
          prompt: "Which range runs down the middle of England, north to south?",
          optionA: "Grampians",
          optionB: "Pennines",
          optionC: "Cairngorms",
          optionD: "Cambrian Mountains",
          correct: "B",
        },
        {
          prompt: "Which war between families is remembered as the Wars of the Roses?",
          optionA: "York vs Lancaster",
          optionB: "Scotland vs England",
          optionC: "Catholics vs Protestants only",
          optionD: "Parliament vs Crown only",
          correct: "A",
        },
        {
          prompt: "Which English king was killed at Bosworth Field in 1485?",
          optionA: "Henry VII",
          optionB: "Richard III",
          optionC: "Edward IV",
          optionD: "Henry VI",
          correct: "B",
        },
        {
          prompt: "Which queen is famous for saying she had the \"heart and stomach of a king\"?",
          optionA: "Mary I",
          optionB: "Elizabeth I",
          optionC: "Victoria",
          optionD: "Anne",
          correct: "B",
        },
        {
          prompt: "Which engineer is famous for improving steam engines in the Industrial Revolution?",
          optionA: "James Watt",
          optionB: "George Stephenson",
          optionC: "Isambard Brunel",
          optionD: "Richard Arkwright",
          correct: "A",
        },
        {
          prompt: "Which treaty in 1707 united the kingdoms of England and Scotland?",
          optionA: "Treaty of Windsor",
          optionB: "Treaty of Union",
          optionC: "Magna Carta",
          optionD: "Act of Supremacy",
          correct: "B",
        },
      ];
    case 7:
      return [
        {
          prompt: "Which animal has fingerprints so similar to humans that they can confuse experts?",
          optionA: "Chimpanzee",
          optionB: "Koala",
          optionC: "Raccoon",
          optionD: "Bear",
          correct: "B",
        },
        {
          prompt: "What is the largest living structure on Earth (made by tiny animals)?",
          optionA: "Amazon rainforest",
          optionB: "Great Barrier Reef",
          optionC: "Grand Canyon",
          optionD: "Himalayas",
          correct: "B",
        },
        {
          prompt: "Which bird has the largest wingspan of any living bird?",
          optionA: "Golden eagle",
          optionB: "Albatross",
          optionC: "Condor",
          optionD: "Stork",
          correct: "B",
        },
        {
          prompt: "Tardigrades (water bears) are famous for surviving extreme…",
          optionA: "Only hot deserts",
          optionB: "Heat, cold, and drying out",
          optionC: "Only deep oceans",
          optionD: "Only polar night",
          correct: "B",
        },
        {
          prompt: "Which mammal can smell underwater using special nostrils?",
          optionA: "Otter",
          optionB: "Polar bear",
          optionC: "Seal",
          optionD: "Dolphin",
          correct: "B",
        },
        {
          prompt: "Which planet has the fastest rotation (shortest day) in the solar system?",
          optionA: "Earth",
          optionB: "Jupiter",
          optionC: "Mercury",
          optionD: "Venus",
          correct: "B",
        },
        {
          prompt: "What is the Kuiper belt mainly full of?",
          optionA: "Hot gas",
          optionB: "Icy bodies and dwarf planets beyond Neptune",
          optionC: "Only asteroids near Mars",
          optionD: "Comets only near Earth",
          correct: "B",
        },
        {
          prompt: "Which moon of Jupiter may hide a salty ocean under its ice?",
          optionA: "Io",
          optionB: "Europa",
          optionC: "Ganymede",
          optionD: "Callisto",
          correct: "B",
        },
        {
          prompt: "A total solar eclipse happens when the Moon passes between Earth and…",
          optionA: "Mars",
          optionB: "The Sun",
          optionC: "Jupiter",
          optionD: "Polaris",
          correct: "B",
        },
        {
          prompt: "Which space telescope launched in 2021 studies infrared light from distant galaxies?",
          optionA: "Hubble",
          optionB: "James Webb",
          optionC: "Kepler",
          optionD: "Chandra",
          correct: "B",
        },
        {
          prompt: "Which UK capital city stands on the Firth of Forth?",
          optionA: "Glasgow",
          optionB: "Edinburgh",
          optionC: "Dundee",
          optionD: "Aberdeen",
          correct: "B",
        },
        {
          prompt: "Which UK national park covers much of the Lake District mountains?",
          optionA: "Snowdonia",
          optionB: "Lake District National Park",
          optionC: "Cairngorms",
          optionD: "Pembrokeshire Coast",
          correct: "B",
        },
        {
          prompt: "Which Scottish city grew rich from North Sea oil in the late 1900s?",
          optionA: "Dundee",
          optionB: "Aberdeen",
          optionC: "Inverness",
          optionD: "Perth",
          correct: "B",
        },
        {
          prompt: "Which English channel port faces France at its narrowest point?",
          optionA: "Southampton",
          optionB: "Dover",
          optionC: "Plymouth",
          optionD: "Hull",
          correct: "B",
        },
        {
          prompt: "Which UK mountain is the highest peak in the British Isles?",
          optionA: "Snowdon",
          optionB: "Scafell Pike",
          optionC: "Ben Nevis",
          optionD: "Slieve Donard",
          correct: "C",
        },
        {
          prompt: "In 1215, King John sealed which important charter at Runnymede?",
          optionA: "Domesday Book",
          optionB: "Magna Carta",
          optionC: "Bill of Rights",
          optionD: "Petition of Right",
          correct: "B",
        },
        {
          prompt: "Which civil war in England ended with Parliament's victory and a republic?",
          optionA: "Wars of the Roses",
          optionB: "English Civil War",
          optionC: "Jacobite risings",
          optionD: "Chartist riots",
          correct: "B",
        },
        {
          prompt: "Which queen's reign is often called the \"Golden Age\" of English drama?",
          optionA: "Victoria",
          optionB: "Elizabeth I",
          optionC: "Anne",
          optionD: "Mary II",
          correct: "B",
        },
        {
          prompt: "Which battle in 1805 confirmed British naval power against Napoleon?",
          optionA: "Waterloo",
          optionB: "Trafalgar",
          optionC: "Blenheim",
          optionD: "Bosworth",
          correct: "B",
        },
        {
          prompt: "Which Act in 1833 began the process of ending slavery in most British colonies?",
          optionA: "Reform Act 1832",
          optionB: "Slavery Abolition Act 1833",
          optionC: "Factory Act 1833",
          optionD: "Poor Law Amendment Act 1834",
          correct: "B",
        },
      ];
    default:
      throw new Error(`Unknown year: ${year}`);
  }
}

/** Extra numeracy drills per year — balanced strands (not 30× addition). */
function extraMathsDrillsForYear(y: number): Row[] {
  const label = `p${y}`;
  const out: Row[] = [];

  for (let k = 0; k < 5; k++) {
    const a = y + k + 3;
    const b = y + 1 + (k % 3);
    out.push(
      maths(y, {
        topic: `${label}_drill_add_${k}`,
        prompt: `What is ${a} + ${b}?`,
        optionA: String(a + b + 1),
        optionB: String(a + b),
        optionC: String(a + b - 1),
        optionD: String(a + b + 2),
        correct: "B",
      }),
    );
  }

  for (let k = 0; k < 5; k++) {
    const a = 18 + y * 4 + k;
    const b = y + k + 2;
    out.push(
      maths(y, {
        topic: `${label}_drill_sub_${k}`,
        prompt: `What is ${a} − ${b}?`,
        optionA: String(a - b - 1),
        optionB: String(a - b),
        optionC: String(a - b + 1),
        optionD: String(a - b + 2),
        correct: "B",
      }),
    );
  }

  for (let k = 0; k < 5; k++) {
    let left: number;
    let right: number;
    if (y <= 2) {
      left = 2 + (k % 2);
      right = 2 + ((y + k) % 4);
    } else {
      left = Math.min(12, y + 1 + k);
      right = Math.min(12, y + (k % 3));
    }
    const prod = left * right;
    out.push(
      maths(y, {
        topic: `${label}_drill_mul_${k}`,
        prompt: `What is ${left} × ${right}?`,
        optionA: String(prod + (k % 3) + 1),
        optionB: String(prod),
        optionC: String(Math.max(0, prod - 2 - k)),
        optionD: String(prod + 3),
        correct: "B",
      }),
    );
  }

  for (let k = 0; k < 5; k++) {
    let divisor: number;
    let quot: number;
    if (y <= 2) {
      divisor = 2;
      quot = 2 + k;
    } else {
      divisor = Math.max(2, y + (k % 4));
      quot = y + 3 + k;
    }
    const dividend = quot * divisor;
    out.push(
      maths(y, {
        topic: `${label}_drill_div_${k}`,
        prompt: `What is ${dividend} ÷ ${divisor}?`,
        optionA: String(quot + 1),
        optionB: String(quot),
        optionC: String(Math.max(1, quot - 1)),
        optionD: String(quot + 2),
        correct: "B",
      }),
    );
  }

  const misc: Row[] = [
    maths(y, {
      topic: `${label}_drill_compare_${y}`,
      prompt: `Which is bigger: ${y + 4} or ${y + 9}?`,
      optionA: String(y + 4),
      optionB: String(y + 9),
      optionC: "They are equal",
      optionD: "Cannot tell",
      correct: "B",
    }),
    maths(y, {
      topic: `${label}_drill_half_${y}`,
      prompt: `What is half of ${(y + 3) * 2}?`,
      optionA: String(y + 2),
      optionB: String(y + 3),
      optionC: String(y + 4),
      optionD: String(y + 5),
      correct: "B",
    }),
    maths(y, {
      topic: `${label}_drill_shape_${y}`,
      prompt: "How many sides does a rectangle have?",
      optionA: "3",
      optionB: "4",
      optionC: "5",
      optionD: "6",
      correct: "B",
    }),
    maths(y, {
      topic: `${label}_drill_round_${y}`,
      prompt: `Round ${y * 10 + 7} to the nearest 10.`,
      optionA: String(Math.round((y * 10 + 7) / 10) * 10 - 10),
      optionB: String(Math.round((y * 10 + 7) / 10) * 10),
      optionC: String(y * 10 + 5),
      optionD: String(y * 10 + 7),
      correct: "B",
    }),
    maths(y, {
      topic: `${label}_drill_word_mul_${y}`,
      prompt: `A pencil costs ${y + 2}p. How much do ${y <= 3 ? 2 : 3} pencils cost?`,
      optionA: String((y + 2) * (y <= 3 ? 2 : 3) + 2),
      optionB: String((y + 2) * (y <= 3 ? 2 : 3)),
      optionC: String((y + 2) * (y <= 3 ? 2 : 3) - 1),
      optionD: String((y + 2) * (y <= 3 ? 2 : 3) + 5),
      correct: "B",
    }),
  ];
  out.push(...misc);

  return out;
}

async function main() {
  const rows: Row[] = [];

  for (let y = 1; y <= 7; y++) {
    for (const q of gkForYear(y)) {
      rows.push(gk(y, q));
    }
  }

  for (let y = 1; y <= 7; y++) {
    const n = 5 + y * 2;
    rows.push(
      maths(y, {
        prompt: `What is ${n} + ${y}?`,
        optionA: String(n + y + 1),
        optionB: String(n + y),
        optionC: String(n + y - 1),
        optionD: String(n + y + 2),
        correct: "B",
      }),
      maths(y, {
        prompt: `What is ${n * 2} − ${y}?`,
        optionA: String(n * 2 - y - 1),
        optionB: String(n * 2 - y),
        optionC: String(n * 2 - y + 1),
        optionD: String(n * 2 - y + 2),
        correct: "B",
      }),
      maths(y, {
        prompt: `How many sides does a square have?`,
        optionA: "3",
        optionB: "4",
        optionC: "5",
        optionD: "6",
        correct: "B",
      }),
      maths(y, {
        prompt: `What is half of ${(y + 2) * 2}?`,
        optionA: String(y + 1),
        optionB: String(y + 2),
        optionC: String(y + 3),
        optionD: String(y + 4),
        correct: "B",
      }),
      maths(y, {
        prompt: `Which number is bigger: ${y} or ${y + 3}?`,
        optionA: String(y),
        optionB: String(y + 3),
        optionC: "They are equal",
        optionD: "Cannot tell",
        correct: "B",
      }),
    );
    rows.push(...extraMathsDrillsForYear(y));
  }

  const db = getAdminDb();
  const batch = db.batch();
  const col = db.collection("questions");

  for (const r of rows) {
    const ref = col.doc();
    batch.set(ref, {
      ...r,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`Seeded ${rows.length} questions.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
