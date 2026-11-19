export type FeedPost = {
  id: string;
  image: number;
  caption: string;
  alt: string;
};

// Names match characters.name. Copied from seoulmate/lib/explore/posts.ts.
const POSTS_BY_NAME: Record<string, FeedPost[]> = {
  Doyoon: [
    {
      id: "evening-coffee",
      image: require("../../assets/feed/evening-coffee.png"),
      caption: "late coffee. the ice is already half gone.",
      alt: "Doyoon at an evening cafe table with an iced coffee, in a black knit and a cross-body strap.",
    },
    {
      id: "mirror-soundcheck",
      image: require("../../assets/feed/mirror-soundcheck.png"),
      caption: "hongdae, before soundcheck.",
      alt: "Doyoon taking a mirror selfie in a navy track jacket, wired earphones in.",
    },
    {
      id: "mirror-pocket",
      image: require("../../assets/feed/mirror-pocket.png"),
      caption: "same jacket. different pocket.",
      alt: "Doyoon in the same navy jacket, one hand in his pocket, earphones in.",
    },
    {
      id: "late-night",
      image: require("../../assets/feed/late-night.png"),
      caption: "couldn't sleep. the wall photos are winning.",
      alt: "Doyoon on a bed with his chin on his hand, earphones in, small photos on the wall.",
    },
  ],
};

export function postsForCharacter(name: string): FeedPost[] {
  return POSTS_BY_NAME[name] ?? [];
}

export function postForCharacter(name: string, postId: string): FeedPost | null {
  return postsForCharacter(name).find((post) => post.id === postId) ?? null;
}
