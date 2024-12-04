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
      model: "gemini-1.5-flash",
    });

    // Mastodon Client Setup
    this.mastodonClient = new Mastodon({
      access_token: process.env.MASTODON_ACCESS_TOKEN,
      api_url: `${process.env.MASTODON_INSTANCE_URL}/api/v1/`,
    });

    // AI Influencer Persona
    this.persona = {
      name: "Nova Tech Insights",
      bio: "AI-powered tech exploration and innovation commentary",
      interests: [
        "Sustainable Technology",
        "AI Ethics",
        "Future of Work",
        "Digital Wellness",
      ],
    };
  }

  async generateContent(topic) {
    const prompt = `Create an engaging social media post about ${topic} from the perspective of a tech-savvy AI researcher. 
        Include insights, a thought-provoking statement, and maintain a professional yet approachable tone. Strictly keep it under 500 characters`;

    try {
      const result = await this.textModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Content Generation Error:", error);
      return null;
    }
  }

  async generateImage(topic) {
    const imagePrompt = `Create a professional, modern illustration representing ${topic} in technology. 
        Use a clean, minimalist design with tech-inspired elements.`;

    try {
      const result = await this.imageModel.generateContent(imagePrompt);

      // Convert image to temporary file
      const imageBuffer = result.response.image();
      const tempFilePath = `/tmp/post_image_${Date.now()}.png`;

      fs.writeFileSync(tempFilePath, imageBuffer);
      return tempFilePath;
    } catch (error) {
      console.error("Image Generation Error:", error);
      return null;
    }
  }

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

  async createScheduledContent() {
    const topics = [
      "AI in Sustainable Development",
      "Ethical Considerations of Machine Learning",
      "Future of Remote Work Technologies",
      "Digital Wellness in the AI Era",
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
        await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 seconds
      }
    }
  }

  // Interactive Response Generation
  async generateInteractiveResponse(userMessage) {
    const prompt = `An AI tech influencer is responding to a message. 
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
