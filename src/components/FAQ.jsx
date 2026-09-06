import { useState } from 'react';
import { MessageSquare, ChevronDown } from 'lucide-react';
import './FAQ.css';

const faqData = [
  {
    id: 1,
    question: "What is Lyfflow?",
    answer: "Lyfflow is an AI-powered customer messaging automation platform for business owners, companies. It connects to your Facebook Messenger, Instagram DMs, and WhatsApp to automatically handle customer conversations 24/7 — so you never miss a lead, inquiry, or support request again."
  },
  {
    id: 2,
    question: "Which messaging platforms does Lyfflow support?",
    answer: "Lyfflow currently supports:\n\n💬 Facebook Messenger — auto-reply to all page message threads\n\nInstagram and WhatsApp will added very soon. All three can be managed from a single unified dashboard."
  },
  {
    id: 3,
    question: "How does Lyfflow's Agent know about my business?",
    answer: "Lyfflow uses your uploaded documents. Instead of training a custom AI model, you simply add your business content to a Knowledge Base — either by typing it manually or uploading documents (PDFs, Word files, etc.).\n\nWhen a customer sends a message, Lyfflow automatically searches your knowledge base for the most relevant information and feeds it to the AI in real time. This means the AI always answers based on your actual business content — accurately and up to date — without any model training or technical setup on your part."
  },
  {
    id: 4,
    question: "Can I customize how an Agent sounds and behaves?",
    answer: "Yes, fully. Through the Agent Personality Configuration, you can set:\n\n• Agent name and role (e.g., \"Maya, Support Agent\")\n• Business name and Context for agent personality\n• Tone and communication style (formal, friendly, casual, etc.)\n• Custom instructions for specific scenarios\n• Fallback messages when agent don't know the ans\n\nThis ensures the AI feels like a natural, on-brand extension of your team."
  },
  {
    id: 5,
    question: "What happens if a customer asks something the AI can't answer?",
    answer: "The agent is designed to handle this gracefully. If it can't find a relevant answer in your knowledge base, it will respond politely with your given fallback messages or default fallback message and , escalate to a human if needed. You can also manually trigger Human Takeover for any conversation — this pauses AI replies and lets you respond directly without the customer noticing any disruption."
  },
  {
    id: 6,
    question: "What is Human Takeover and how does it work?",
    answer: "Human Takeover is a toggle you can switch on per conversation. When enabled:\n\n• The AI stops replying for that specific thread\n• You or your team take over and respond manually\n• When you're done, you can re-enable the AI to resume automation\n\nThis is perfect for handling sensitive, complex, or high-value customer interactions."
  },
  {
    id: 7,
    question: "Can I see all conversations across platforms in one place?",
    answer: "Yes. Lyfflow features a unified Conversation Inbox that aggregates messages from Messenger, Instagram, and WhatsApp into a single view. You can switch by platform, monitor AI activity, see message history, and jump into any thread at any time."
  },
  {
    id: 8,
    question: "Do I need technical knowledge to use Lyfflow?",
    answer: "Not at all. Lyfflow is built for business owners and marketing teams. Connecting your social accounts, uploading your knowledge base, and configuring your AI agent are all done through an intuitive dashboard — no coding or AI technical knowledge required."
  },
  {
    id: 9,
    question: "How many pages or accounts can I connect?",
    answer: "You can connect multiple Facebook Pages, Instagram Business accounts, and WhatsApp Business numbers — depending on your subscription plan. This makes Lyfflow ideal for agencies or businesses managing multiple brands or locations."
  },
  {
    id: 11,
    question: "What languages does Lyfflow support?",
    answer: "The AI can converse in multiple languages. It automatically detects the language your customer writes in — whether that's English, Bengali, Arabic, or others — and responds accordingly. No separate configuration needed."
  },
  {
    id: 12,
    question: "Is my data and my customers' data secure?",
    answer: "Yes. Lyfflow is built with privacy and security at its core:\n\n• All data is encrypted in transit and at rest\n• Compliant with GDPR, CCPA, and Bangladesh data protection standards\n• Customer conversation data is never sold or shared with third parties\n• You retain full ownership of your data at all times"
  },
  {
    id: 13,
    question: "Does Lyfflow work 24/7/365?",
    answer: "Yes — that's the whole point. Your AI agent never sleeps, never takes a break, and responds instantly at any hour. Whether a customer messages at midnight or during a holiday, they'll get a timely, accurate reply."
  },
  {
    id: 14,
    question: "How do I get started with Lyfflow?",
    answer: "Getting started takes just a few minutes:\n\n1. Connect your facebook/Instagram/WhatsApp accounts with Lyfflow.\n2. Upload your knowledge base and configure your AI agent\n3. Assign your AI agent to any pages/accounts — your AI starts handling conversations automatically"
  }
];

export default function FAQ() {
  const [openId, setOpenId] = useState(null);

  const toggleFAQ = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="faq-section" id="faq">
      <div className="faq-container max-w-4xl mx-auto px-6 py-24">
        <div className="faq-header text-center mb-20 flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary font-semibold text-sm mb-8 border border-secondary/20 animate-fade-up">
            <MessageSquare size={16} />
            Got Questions? We've Got Answers
          </div>

          <h2 className="text-4xl md:text-6xl font-headline font-black mb-8 tracking-tighter text-on-surface animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Frequently Asked Questions
          </h2>

          <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Everything you need to know about Lyfflow, how it works, and how it can help you automate your customer interactions seamlessly.
          </p>
        </div>

        <div className="faq-list flex flex-col gap-4">
          {faqData.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div 
                key={faq.id} 
                className={`faq-item bg-surface rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen 
                    ? 'border-secondary shadow-lg shadow-secondary/10' 
                    : 'border-outline-variant hover:border-primary/30 hover:shadow-md'
                }`}
              >
                <button
                  className="faq-question w-full text-left focus:outline-none"
                  onClick={() => toggleFAQ(faq.id)}
                  aria-expanded={isOpen}
                >
                  <div className="flex justify-between items-center p-6 w-full box-border">
                    <span className={`text-lg font-bold font-body transition-colors duration-300 pr-4 ${isOpen ? 'text-secondary' : 'text-on-surface'}`}>
                      {faq.question}
                    </span>
                    <div className={`faq-icon flex-shrink-0 ml-4 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-300 ${
                      isOpen ? 'bg-secondary text-white rotate-180' : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </button>
                
                <div 
                  className={`faq-answer-wrapper transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="p-6 pt-0 text-on-surface-variant font-body leading-relaxed faq-answer-content">
                    {faq.answer.split('\n').map((line, index) => (
                      <span key={index}>
                        {line}
                        {index !== faq.answer.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-on-surface-variant mb-6 text-lg">Still have questions?</p>
          <a href="/support" className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-primary hover:bg-primary/90 transition-all rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}
