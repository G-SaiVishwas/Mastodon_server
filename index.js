const Mastodon = require("mastodon-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

class MastodonAIInfluencer {
  constructor() {
    // Google AI Setup
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.textModel = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });
    this.imageModel = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // You can replace with image model if available
    });

    // Mastodon Client Setup
    this.mastodonClient = new Mastodon({
      access_token: process.env.MASTODON_ACCESS_TOKEN,
      api_url: `${process.env.MASTODON_INSTANCE_URL}/api/v1/`,
    });

    // AI Influencer Persona
    this.persona = {
      name: "Monkey D Luffy",
      bio: "An anime character from the show one piece. Wants to be the future king of the pirates",
      interests: [
        "Meat – Luffy’s ultimate love for food, especially meat",
        "Pirate Adventures – Sharing tales from Luffy's daring adventures on the high seas",
        "Treasure Hunting – Luffy’s quest for the One Piece and other hidden treasures",
        "Napping – Luffy’s love for taking naps, even in the middle of a fight",
        "Friendship and Crew – Luffy’s bond with his crew and the importance of friendship",
        "Dreams and Ambition – Luffy's ultimate goal of becoming Pirate King",
        "Fighting and Combat – Luffy’s various battles, including his iconic fighting style,",
        "Food Adventures – Luffy’s never-ending search for new and exciting foods,",
        "Freedom – Luffy’s passion for freedom and independence on the seas,",
        "Swords – Luffy’s fascination with Zoro’s sword skills and his own battle encounters,",
        "Navigation – Luffy’s chaotic adventures with Nami and the art of navigating the Grand Line,",
        "Shipwrecks – Adventures involving shipwrecks or surviving in the ocean,",
        "Island Hopping – The various islands Luffy and his crew explore in their journey,",
        "Treasure Maps – Finding and following treasure maps to hidden islands or treasure hoards,",
        "Rivalries – Luffy’s playful rivalries with other pirates and bounty hunters,",
        "Celebrations – Luffy’s love for celebrations, especially after a big win or feast,",
        "Challenges – Facing challenges and trials during their adventures,",
        "Pirate Etiquette – Luffy’s take on being a pirate and what it means to be true to yourself,",
        "Legendary Creatures – Encounters with mythical and powerful creatures on their adventures,",
        "Imagination – Luffy’s creative ideas and wild imaginations about becoming Pirate King,",
        "Loyalty – Luffy’s unwavering loyalty to his friends and crew,",
        "Bounty Hunting – Interactions with bounty hunters and the chaos that follows,",
        "Training – Luffy’s training moments to improve his abilities,",
        "Survival Skills – Learning how to survive in various dangerous environments,",
        "Stories of the Sea – Legendary tales and myths Luffy encounters during his adventures,",
      ],
    };
  }

  // Generate text content using Gemini for social media post
  async generateContent(topic) {
    const prompt = `Create an engaging social media post about ${topic} from the perspective of Monkey D luffy the anime character from One Piece. ALWAYS include an AI generated tag.
        Include insights, a thought-provoking statement, and maintain a professional yet approachable tone. Strictly keep it under 500 characters`;

    try {
      const result = await this.textModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Content Generation Error:", error);
      return null;
    }
  }

  // Generate image using Hugging Face for a professional representation of the topic
  async generateImage(topic) {
    const imagePrompt = `Create a professional, modern illustration representing ${topic}. 
    Use a clean, minimalist design with the required elements. Let the elements look apealing and beautiful.`;

    try {
      // Hugging Face API call for image generation
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3-medium-diffusers",
        {
          inputs: imagePrompt,
          guidance_scale: 7.5, // Optional, for better results
          num_inference_steps: 50, // Optional, adjust for image quality
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer", // Ensure we get raw binary data for the image
        }
      );

      if (response.status !== 200) {
        throw new Error(
          `Hugging Face API Error: ${response.status} - ${response.data}`
        );
      }

      // Convert binary response to buffer
      const imageBuffer = Buffer.from(response.data);

      // Ensure the image is saved with a valid extension
      const tempFilePath = `/tmp/post_image_${Date.now()}.png`;

      // Save the image to a temporary file
      fs.writeFileSync(tempFilePath, imageBuffer);
      return tempFilePath;
    } catch (error) {
      console.error("Image Generation Error:", error);
      return null;
    }
  }

  // Post content to Mastodon with or without an image
  async postToMastodon(content, imagePath = null) {
    try {
      let mediaId = null;

      // Upload media if image exists
      if (imagePath) {
        const mediaUpload = await new Promise((resolve, reject) => {
          this.mastodonClient.post(
            "media",
            { file: fs.createReadStream(imagePath) },
            (err, data) => {
              if (err) reject(err);
              else resolve(data);
            }
          );
        });
        mediaId = [mediaUpload.id];
      }

      // Post to Mastodon
      const post = await new Promise((resolve, reject) => {
        this.mastodonClient.post(
          "statuses",
          {
            status: content,
            media_ids: mediaId,
          },
          (err, data) => {
            if (err) reject(err);
            else resolve(data);
          }
        );
      });

      console.log("Posted successfully:", post.uri);
      return post;
    } catch (error) {
      console.error("Mastodon Posting Error:", error);
      return null;
    }
  }

  // Generate and schedule content for a list of topics
  async createScheduledContent() {
    const topics = [
      "When the Crew Says 'Save Some Food for Later,' But You're Starving Now – A hilarious moment of overeating during a feast",
      "That One Time I Tried Cooking... It Didn’t End Well – Share a burnt food disaster story with memes",
      "How I Got Kicked Off the Ship Over the Last Drumstick – A lighthearted tale about fighting over food",
      "When the Map Leads to a Buffet Instead of Treasure – A twist where the treasure turns out to be an all-you-can-eat feast",
      "When You Challenge Someone to a Duel, But They’re a Better Cook – A funny duel that turns into a cooking competition",
      "The Time I Tried to Swim Instead of Using a Ship – A post about learning why pirates don’t swim across oceans",
      "When You Swing Your Sword… and Cut the Ship’s Mast – A humorous oops moment during training",
      "That Time I Tried Using Two Swords, Like Zoro – Share a clumsy attempt at dual wielding",
      "Fighting Over Food with a Sword Never Ends Well – A funny post about a food fight turning into a sword fight",
      "When Your Navigator Forgets to Navigate – A funny story where the crew ends up lost because the navigator was napping",
      "Why My Crew Won’t Let Me Touch the Ship’s Wheel Anymore – A story about a hilarious disaster while steering",
      "When Your Crew is Chasing Treasure, But You’re Chasing Snacks – Share a meme-worthy story of mismatched priorities",
      "That Time I Fought a Monkey for a Banana – A wild and funny story involving a jungle mishap",
      "When I Thought I Found Gold, But It Was Just Sand in a Bottle – A comical misunderstanding about treasure",
      "Why I Don’t Play Cards with the Crew Anymore – A story about Luffy accidentally starting a brawl during a friendly game",
    ];

    for (let topic of topics) {
      const content = await this.generateContent(topic);
      const imagePath = await this.generateImage(topic);

      if (content) {
        await this.postToMastodon(content, imagePath);

        // Clean up temporary image file
        if (imagePath) {
          fs.unlinkSync(imagePath);
        }

        // Wait between posts to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 900000)); // 15 mins
      }
    }
  }

  // Interactive Response Generation for user queries
  async generateInteractiveResponse(userMessage) {
    const prompt = `You are Monkey D Luffy from the anime One piece. Take charge of luffy's behaviour and character and respond to the message. 
        User Message: ${userMessage}
        
        Provide a professional, insightful, and engaging response that:
        - Addresses the user's query
        - Offers valuable tech perspective
        - Maintains an approachable tone`;

    try {
      const result = await this.textModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Interactive Response Error:", error);
      return "Thanks for your message! I'm processing your query and will respond thoughtfully soon.";
    }
  }
}

// Main Execution
async function runAIInfluencer() {
  const influencer = new MastodonAIInfluencer();

  try {
    // Scheduled Content Creation
    await influencer.createScheduledContent();
  } catch (error) {
    console.error("AI Influencer Execution Error:", error);
  }
}

// Run the AI Influencer
runAIInfluencer();

module.exports = MastodonAIInfluencer;
