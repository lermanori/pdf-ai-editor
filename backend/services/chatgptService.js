const OpenAI = require('openai');

class ChatGPTService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.log('⚠️  OpenAI API key not configured - using mock translations');
      this.openai = null;
    } else {
      console.log('✅ OpenAI API key configured');
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
    }
  }

  async translateText(text) {
    try {
      if (!this.openai) {
        // Return mock translation for demo purposes
        console.log('🔄 Using mock translation (no OpenAI API key configured)');
        return this.getMockTranslation();
      }

      console.log('🤖 Sending text to OpenAI for translation...');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          // {
          //   role: 'system',
          //   content: 'You are a professional translator. Translate the given English text to natural Hebrew. Return only the Hebrew translation without any additional text, explanations, or formatting. If there is no English text to translate, return "אין טקסט לתרגום".'
          // },
          {
            role: 'user',
            content: `Translate this text to Hebrew: "${text}"`
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      const translation = response.choices[0]?.message?.content?.trim();
      
      if (!translation) {
        throw new Error('No translation received from OpenAI');
      }

      console.log('✅ Translation received from OpenAI:', translation.substring(0, 50) + '...');
      return translation;

    } catch (error) {
      console.error('❌ OpenAI API error:', error.message);
      
      // Return mock translation on error
      console.log('🔄 Falling back to mock translation');
      return this.getMockTranslation();
    }
  }

  // Keep the old method for backward compatibility if needed
  async translateImage(base64Image) {
    console.log('⚠️  translateImage method is deprecated. Use translateText instead.');
    return this.translateText('Deprecated method called');
  }

  getMockTranslation() {
    const mockTranslations = [
      'טקסט בעברית לדוגמה',
      'תרגום מדומה לטקסט',
      'זהו תרגום לדוגמה בעברית',
      'טקסט מתורגם לעברית',
      'דוגמה לתרגום עברי',
      'תרגום אוטומטי לעברית',
      'טקסט לדוגמה בעברית',
      'תוכן מתורגם לעברית'
    ];
    
    const randomTranslation = mockTranslations[Math.floor(Math.random() * mockTranslations.length)];
    console.log('🎭 Mock translation generated:', randomTranslation);
    return randomTranslation;
  }

  // Test the OpenAI connection
  async testConnection() {
    try {
      if (!this.openai) {
        return { 
          success: false, 
          message: 'No OpenAI API key configured',
          usingMock: true
        };
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });

      return { 
        success: true, 
        message: 'OpenAI API connection successful',
        model: response.model,
        usingMock: false
      };
    } catch (error) {
      return { 
        success: false, 
        message: `OpenAI API connection failed: ${error.message}`,
        usingMock: true
      };
    }
  }
}

module.exports = new ChatGPTService(); 