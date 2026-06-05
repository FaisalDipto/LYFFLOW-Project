import React, { useState, useEffect } from "react";

export default function LegalCenter() {
  const [activeSection, setActiveSection] = useState("sec-1");

  useEffect(() => {
    const sectionElements = document.querySelectorAll("article > section[id]");

    // Create an observer to watch for sections entering the screen
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the intersecting entry (sometimes multiple fire at once, this ensures we grab the visible one)
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-15% 0px -65% 0px", // Trigger when section is near the top of the viewport
        threshold: 0,
      }
    );

    sectionElements.forEach((el) => observer.observe(el));

    return () => {
      sectionElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Handle scrolling to hash on mount
  useEffect(() => {
    if (window.location.hash) {
      setTimeout(() => {
        const id = window.location.hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          setActiveSection(id);
        }
      }, 100);
    }
  }, []);

  const getLinkClasses = (sectionId) => {
    if (activeSection === sectionId) {
      return "flex items-center gap-3 px-4 py-3 text-primary font-bold bg-surface-container-lowest rounded-xl shadow-sm transition-transform duration-200 translate-x-1";
    }
    return "flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-lowest/50 rounded-xl transition-transform duration-200 hover:translate-x-1";
  };

  const navLinks = [
    { id: "aggrement_to_terms", title: "Agreement to Terms", icon: "handshake" },
    { id: "description_of_service", title: "Description of Service", icon: "apps" },
    { id: "eligibility", title: "Eligibility", icon: "verified_user" },
    { id: "account_registation_and_security", title: "Account Registration", icon: "person_add" },
    { id: "subscriptions_billing_and_payment", title: "Subscriptions & Billing", icon: "credit_card" },
    { id: "acceptable_use_policy", title: "Acceptable Use Policy", icon: "rule" },
    { id: "facebook_and_meta_platform", title: "Meta Compliance", icon: "policy" },
    { id: "intellectual_property_rights", title: "Intellectual Property", icon: "copyright" },
    { id: "privacy_policy_and_security", title: "Privacy Policy", icon: "lock" },
    { id: "service_availability_and_maintenance", title: "Service Availability", icon: "dns" },
    { id: "suspension_and_termination", title: "Suspension & Termination", icon: "block" },
    { id: "disclaimers_and_warranties", title: "Disclaimers & Warranties", icon: "warning" },
    { id: "limitation_of_liability", title: "Limitation of Liability", icon: "shield" },
    { id: "dispute_resolution", title: "Dispute Resolution", icon: "balance" },
    { id: "confidentiality", title: "Confidentiality", icon: "visibility_off" },
    { id: "modifications_to_terms_and_service", title: "Modifications", icon: "update" },
    { id: "data_deletion_instructions", title: "Data Deletion", icon: "delete_forever" },
    { id: "contact_information", title: "Contact Information", icon: "contact_support" },
  ];

  return (
    <section className="max-w-[1440px] mx-auto px-6 md:px-12 pt-[136px] pb-24 flex flex-col lg:flex-row gap-16 border-t border-surface-variant">
      {/* SideNavBar (Sticky Sidebar) */}
      <aside className="lg:w-80 relative flex-shrink-0">
        <div className="sticky top-[120px] w-full h-fit p-6 bg-surface-container-low dark:bg-slate-900 rounded-2xl font-body text-sm font-medium border border-surface-variant/50">
          <div className="mb-6">
            <h2 className="text-xl font-black text-on-surface tracking-tight">Lyfflow Trust Center</h2>
            <p className="text-xs text-on-surface-variant mt-1 uppercase tracking-wider">
              Updated April 2026
            </p>
          </div>

          <nav className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
            {navLinks.map((link) => (
              <a key={link.id} href={`#${link.id}`} className={getLinkClasses(link.id)}>
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={activeSection === link.id ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {link.icon}
                </span>
                {link.title}
              </a>
            ))}
          </nav>

          <div className="mt-8 p-6 bg-secondary-container rounded-xl overflow-hidden relative group">
            <div className="relative z-10">
              <p className="text-on-secondary-container font-bold text-xs uppercase tracking-widest mb-2">
                Need help?
              </p>
              <p className="text-on-secondary-container text-sm leading-relaxed mb-4">
                Questions about our legal framework?
              </p>
              <a
                href="mailto:legal@lyfflow.com"
                className="text-xs font-black flex items-center gap-1 group-hover:gap-2 transition-all text-on-secondary-container"
              >
                CONTACT LEGAL{" "}
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </a>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-8xl">gavel</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Content Column */}
      <article className="flex-1 max-w-4xl space-y-20 pb-32">
        
        {/* Page Header */}
        <header className="mb-16">
          <h1 className="font-headline text-5xl md:text-6xl font-black text-on-surface tracking-tighter mb-4">
            Terms of Service & Privacy
          </h1>
          <div className="h-1.5 w-24 bg-secondary rounded-full"></div>
          <p className="mt-6 text-on-surface-variant font-medium text-lg">
            <strong>Effective Date:</strong> April 16, 2026 <br />
            <strong>Last Updated:</strong> April 16, 2026
          </p>
        </header>

        <section id="aggrement_to_terms" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">1. Agreement to Terms</h2>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Lyfflow ("Company," "we," "us," or "our"), governing your access to and use of the Lyfflow platform, including all associated software, services, APIs, dashboards, and features (collectively, the "Service").
          </p>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mt-4">
            By registering an account, accessing the Service, or clicking "I Agree," you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you must not access or use the Service.
          </p>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mt-4">
            If you are accepting these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind that entity to these Terms.
          </p>
        </section>

        <section id="description_of_service" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">2. Description of Service</h2>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4">
            Lyfflow is a Software-as-a-Service (SaaS) platform that enables businesses and individuals ("Clients") to deploy AI-powered automation agents on social media platforms (e.g., Facebook, Messenger, Instagram, TikTok, etc.). Core features of the Service include, but are not limited to:
          </p>
          <ul className="space-y-4 text-on-surface-variant ml-4 border-l-2 border-primary/20 pl-6">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">check_circle</span>
              <span className="text-lg">Creation and configuration of AI agents with customizable personalities and response behaviors;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">check_circle</span>
              <span className="text-lg">Integration with social media accounts via the Platform;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">check_circle</span>
              <span className="text-lg">Knowledge base management, including manual text entries, import from website and document uploads processed via vector search;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">check_circle</span>
              <span className="text-lg">Automated AI responses to incoming Messenger conversations, comments, etc;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">check_circle</span>
              <span className="text-lg">Human takeover controls allowing agents to be paused and conversations managed manually;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">check_circle</span>
              <span className="text-lg">Conversation and message history storage and retrieval;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">check_circle</span>
              <span className="text-lg">Multi-page and multi-admin support.</span>
            </li>
          </ul>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mt-4">
            The Service may be updated, modified, or expanded at any time at our sole discretion.
          </p>
        </section>

        <section id="eligibility" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">3. Eligibility</h2>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4">
            To use the Service, you must:
          </p>
          <ol className="list-decimal list-outside space-y-2 text-on-surface-variant ml-6 text-lg font-light">
            <li>Be at least 18 years of age, or the age of legal majority in your jurisdiction;</li>
            <li>Have the legal capacity to enter into a binding contract;</li>
            <li>Not be prohibited from using the Service under applicable laws;</li>
            <li>Comply with Meta's Platform Terms and Policies in connection with any Facebook Page you connect to the Service.</li>
          </ol>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mt-4">
            By using the Service, you represent and warrant that you meet all of the above eligibility requirements.
          </p>
        </section>

        <section id="account_registation_and_security" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">4. Account Registration and Security</h2>
          
          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">4.1 Account Creation</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            To access the Service, you must register for an account by providing accurate, current, and complete information. You agree to maintain and promptly update your account information to keep it accurate and current.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">4.2 Account Credentials</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            You are solely responsible for maintaining the confidentiality of your account credentials, including your password. You must not share your credentials with any unauthorized third party. You agree to notify us immediately at <a href="mailto:support@lyfflow.com" className="text-primary hover:underline">support@lyfflow.com</a> if you suspect any unauthorized access to or use of your account.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">4.3 Account Responsibility</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            You are fully responsible for all activities that occur under your account, whether or not authorized by you. Lyfflow shall not be liable for any loss or damage arising from your failure to protect your account credentials.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">4.4 One Account Per User</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            Unless expressly authorized by Lyfflow, each individual or entity may maintain only one active account. Duplicate accounts may be suspended or terminated.
          </p>
        </section>

        <section id="subscriptions_billing_and_payment" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">5. Subscriptions, Billing, and Payment</h2>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">5.1 Subscription Plans</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            Access to the Service requires a free/paid subscription. Details of available plans, pricing, and included features are described on our pricing page at <a href="https://lyfflow.com/app/pricing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">lyfflow.com/app/pricing</a>. We reserve the right to modify pricing at any time, with notice as described in Section 18.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">5.2 Billing Cycle</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            Subscriptions are billed on a recurring basis (monthly or annually, as selected) beginning on the date of your initial subscription. Billing continues automatically until your subscription is cancelled.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">5.3 Payment Authorization</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            By providing payment information, you authorize Lyfflow (or its designated payment processor) to charge your payment method for all applicable fees. You represent that you are authorized to use the payment method provided.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">5.4 Taxes</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            All fees are exclusive of applicable taxes (including VAT, GST, or similar), which shall be your sole responsibility. Lyfflow may collect applicable taxes where required by law.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">5.5 Failed Payments</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            If a payment fails, we will attempt to notify you. Access to the Service may be suspended until outstanding amounts are settled. Lyfflow reserves the right to terminate accounts with repeated payment failures.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">5.6 No Refunds</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            All fees paid are non-refundable except as expressly required by applicable law or as stated in a separate refund policy published by Lyfflow. Unused subscription time is not refunded upon cancellation.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">5.7 Free Trials</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            If Lyfflow offers a free trial, it will be subject to any additional terms communicated at sign-up. Upon expiry of the trial, you will be charged unless you cancel prior to the trial end date.
          </p>
        </section>

        <section id="acceptable_use_policy" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">6. Acceptable Use Policy</h2>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">6.1 Permitted Use</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            You may use the Service solely for lawful business purposes and in accordance with these Terms, all applicable laws, and Meta's Platform Terms.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-6 mt-6">6.2 Prohibited Activities</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4">
            You must not use the Service to:
          </p>
          <ul className="space-y-4 text-on-surface-variant ml-4 border-l-2 border-red-500/20 pl-6">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Send unsolicited, deceptive, fraudulent, or spam messages to Facebook Messenger users;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Impersonate any person, company, or entity, or misrepresent your affiliation with any party;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Collect, harvest, or process personal data of Messenger users in violation of applicable privacy laws (including GDPR, PDPA, or equivalent legislation);</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Disseminate content that is illegal, defamatory, obscene, threatening, abusive, hateful, or otherwise objectionable;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Violate Meta's Platform Policies or Community Standards;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Engage in any activity that constitutes unauthorized automation, scraping, or data extraction from Meta's platforms beyond what is permitted under Meta's API terms;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Distribute malware, viruses, or any other malicious code;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Interfere with or disrupt the integrity or performance of the Service or its infrastructure;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Attempt to gain unauthorized access to any component of the Service or its related systems;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Circumvent, disable, or otherwise interfere with security features of the Service;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Resell, sublicense, or commercialize access to the Service without our express written authorization;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">cancel</span>
              <span className="text-lg">Use the Service in a manner that could expose Lyfflow to legal liability.</span>
            </li>
          </ul>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">6.3 AI-Generated Content</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            You acknowledge that AI-generated responses produced by the Service are automated and may not always be accurate, appropriate, or suitable. You are solely responsible for reviewing AI agent configurations, monitoring deployed agents, and ensuring compliance with applicable laws and Meta policies.
          </p>
        </section>

        <section id="facebook_and_meta_platform" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">7. Facebook and Meta Platform Compliance</h2>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4">
            The Service integrates with the Meta Platform. Your use of the Service in connection with Facebook Pages is additionally governed by:
          </p>
          <ul className="space-y-4 text-on-surface-variant ml-4 border-l-2 border-primary/20 pl-6">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">policy</span>
              <span className="text-lg">
                <a href="https://developers.facebook.com/terms/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Meta's Platform Terms
                </a>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">policy</span>
              <span className="text-lg">
                <a href="https://transparency.fb.com/policies/community-standards/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Meta's Community Standards
                </a>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">policy</span>
              <span className="text-lg">
                <a href="https://developers.facebook.com/docs/messenger-platform/policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Meta's Messenger Platform Policy
                </a>
              </span>
            </li>
          </ul>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mt-4">
            You agree to comply with all such policies. Lyfflow is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. We are not responsible for any suspension, restriction, or termination of your Facebook Page or developer account by Meta.
          </p>
        </section>

        <section id="intellectual_property_rights" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">8. Intellectual Property Rights</h2>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">8.1 Lyfflow's Intellectual Property</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            All rights, title, and interest in and to the Service, including all software, algorithms, user interfaces, designs, trademarks, service marks, logos, and documentation, are owned by or licensed to Lyfflow. Nothing in these Terms grants you any right, title, or license to Lyfflow's intellectual property except for the limited right to use the Service as set forth herein.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">8.2 Your Content and Data</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            You retain all ownership rights to content, data, and materials you upload to or create through the Service ("User Content"), including knowledge base documents, agent configurations, and conversation data. By uploading User Content, you grant Lyfflow a non-exclusive, worldwide, royalty-free license to store, process, and transmit your User Content solely as necessary to provide the Service.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">8.3 Feedback</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            If you provide suggestions, feedback, or ideas regarding the Service, you grant Lyfflow a perpetual, irrevocable, royalty-free license to use such feedback for any purpose without compensation or attribution to you.
          </p>
        </section>

        <section id="privacy_policy_and_security" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">9. Privacy Policy and Security</h2>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4">
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, website, and related services (collectively, the "Service").
          </p>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4">
            By accessing or using Lyfflow, you agree to the terms of this Privacy Policy. If you do not agree, please discontinue use of the Service immediately.
          </p>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-6">
            This policy applies to all users of Lyfflow globally, including users located in Bangladesh, the European Union, the United Kingdom, and the United States of America.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">9.1 Information We Collect</h3>
          
          <h4 className="font-bold text-lg text-on-surface mt-4 mb-2">Information You Provide Directly</h4>
          <ul className="space-y-4 text-on-surface-variant ml-4 border-l-2 border-primary/20 pl-6 mb-6">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">person</span>
              <span className="text-lg"><strong>Account Information:</strong> Full name, email address, phone number, and password you provide.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">storefront</span>
              <span className="text-lg"><strong>Business Information:</strong> Business or page name, industry type, and relevant business details you provide during onboarding.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">credit_card</span>
              <span className="text-lg"><strong>Payment Information:</strong> Billing address and payment details processed securely through third-party payment processors. We do not store raw card data on our servers.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">support_agent</span>
              <span className="text-lg"><strong>Support Communications:</strong> Any messages, feedback, or inquiries you send to our support team.</span>
            </li>
          </ul>

          <h4 className="font-bold text-lg text-on-surface mt-6 mb-2">Information from Third-Party Platforms</h4>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4">
            When you connect Lyfflow to your Facebook Page or Instagram account via the Meta API, we collect:
          </p>
          <ul className="space-y-4 text-on-surface-variant ml-4 border-l-2 border-primary/20 pl-6">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">account_box</span>
              <span className="text-lg"><strong>Account Information:</strong> Name, email, account ID.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">api</span>
              <span className="text-lg"><strong>Facebook Page Access Tokens</strong> required to send and receive messages on your behalf.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">data_object</span>
              <span className="text-lg"><strong>Page metadata:</strong> Page name, page ID, and page category, page task, page email, page phone number, page description, page fan count, page location, page link, website and page profile picture.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">forum</span>
              <span className="text-lg"><strong>Conversation data:</strong> Messages, comments, and user interactions on your connected Facebook Page or Instagram account.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">fingerprint</span>
              <span className="text-lg"><strong>Messenger user identifiers (PSIDs):</strong> Unique identifiers assigned by Facebook to individuals who message your Page. We do not receive personal profile information about your customers beyond what they voluntarily share in conversation.</span>
            </li>
          </ul>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-8">9.2 Information Collected Automatically</h3>
          <ul className="space-y-4 text-on-surface-variant ml-4 border-l-2 border-primary/20 pl-6 mb-6">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">analytics</span>
              <span className="text-lg"><strong>Usage Data:</strong> Pages visited, features used, session duration, click events, and navigation paths within the platform.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">devices</span>
              <span className="text-lg"><strong>Device and Technical Data:</strong> IP address, browser type and version, operating system, device identifiers, and time zone.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">receipt_long</span>
              <span className="text-lg"><strong>Log Data:</strong> Server logs, error reports, and API request logs for security and debugging purposes.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">cookie</span>
              <span className="text-lg"><strong>Cookies and Tracking Technologies:</strong> Session cookies, persistent cookies, and similar technologies to maintain your session, remember preferences, and analyze usage.</span>
            </li>
          </ul>

          <h4 className="font-bold text-lg text-on-surface mt-6 mb-2">AI-Generated and Processed Data</h4>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4">
            As part of delivering AI-powered features, Lyfflow processes:
          </p>
          <ul className="space-y-4 text-on-surface-variant ml-4 border-l-2 border-primary/20 pl-6 mb-4">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">smart_toy</span>
              <span className="text-lg">Conversation content to generate smart replies and response suggestions.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">history</span>
              <span className="text-lg">Message history to provide contextually relevant AI responses.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">upload_file</span>
              <span className="text-lg">Knowledge base content you upload (text, documents) to generate smart replies by your AI agent.</span>
            </li>
          </ul>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-6">
            This data is processed by our AI infrastructure and, where applicable, by third-party AI providers including OpenAI. Please refer to Section 9.4 for details on third-party sharing.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-8">9.3 How We Use Your Information</h3>
          <div className="overflow-x-auto rounded-xl border border-surface-variant/30 mb-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-highest">
                  <th className="py-4 px-6 font-bold text-on-surface border-b border-surface-variant/30">Purpose</th>
                  <th className="py-4 px-6 font-bold text-on-surface border-b border-surface-variant/30">Legal Basis (GDPR)</th>
                </tr>
              </thead>
              <tbody className="text-on-surface-variant font-light text-lg divide-y divide-surface-variant/20 bg-surface-container-lowest">
                <tr className="hover:bg-surface-container/50 transition-colors"><td className="py-4 px-6">To provide, operate, and maintain the Service</td><td className="py-4 px-6 font-medium">Performance of contract</td></tr>
                <tr className="hover:bg-surface-container/50 transition-colors"><td className="py-4 px-6">To authenticate your identity and manage your account</td><td className="py-4 px-6 font-medium">Performance of contract</td></tr>
                <tr className="hover:bg-surface-container/50 transition-colors"><td className="py-4 px-6">To process payments and send billing communications</td><td className="py-4 px-6 font-medium">Performance of contract / Legal obligation</td></tr>
                <tr className="hover:bg-surface-container/50 transition-colors"><td className="py-4 px-6">To generate AI-powered replies on your behalf</td><td className="py-4 px-6 font-medium">Performance of contract</td></tr>
                <tr className="hover:bg-surface-container/50 transition-colors"><td className="py-4 px-6">To improve platform features and user experience</td><td className="py-4 px-6 font-medium">Legitimate interest</td></tr>
                <tr className="hover:bg-surface-container/50 transition-colors"><td className="py-4 px-6">To monitor for security threats and prevent fraud</td><td className="py-4 px-6 font-medium">Legitimate interest / Legal obligation</td></tr>
                <tr className="hover:bg-surface-container/50 transition-colors"><td className="py-4 px-6">To send product updates, feature announcements, and newsletters</td><td className="py-4 px-6 font-medium">Consent</td></tr>
                <tr className="hover:bg-surface-container/50 transition-colors"><td className="py-4 px-6">To comply with applicable laws and regulations</td><td className="py-4 px-6 font-medium">Legal obligation</td></tr>
                <tr className="hover:bg-surface-container/50 transition-colors"><td className="py-4 px-6">To respond to support requests</td><td className="py-4 px-6 font-medium">Legitimate interest / Performance of contract</td></tr>
                <tr className="hover:bg-surface-container/50 transition-colors"><td className="py-4 px-6">To conduct analytics and measure platform performance</td><td className="py-4 px-6 font-medium">Legitimate interest</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-6">
            We will never use your data for purposes incompatible with those listed above without your explicit consent. <strong>We will also never use your private data to train our A.I. models.</strong>
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-8">9.4 How We Share Your Information</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4">
            We do not sell your personal information. We may share your information only in the following circumstances:
          </p>
          
          <h4 className="font-bold text-lg text-on-surface mt-4 mb-2">9.4.1 Service Providers and Sub-processors</h4>
          <ul className="space-y-3 text-on-surface-variant ml-4 border-l-2 border-primary/20 pl-6 list-disc list-inside text-lg font-light mb-4">
            <li><strong>LLM Service Provider</strong> — for AI language model inference and smart reply generation.</li>
            <li><strong>Vector Database</strong> — for vector database storage used in AI knowledge base features.</li>
            <li><strong>Meta (Facebook)</strong> — for Messenger and Instagram API integration.</li>
            <li><strong>Payment Processors</strong> — for secure billing and subscription management.</li>
            <li><strong>Cloud Infrastructure Providers</strong> — for hosting, storage, and computing services.</li>
            <li><strong>Analytics Providers</strong> — for usage analytics and product improvement.</li>
          </ul>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-6">
            All sub-processors are bound by data processing agreements and are required to implement appropriate security measures.
          </p>

          <h4 className="font-bold text-lg text-on-surface mt-4 mb-2">9.4.2 Business Transfers</h4>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-6">
            If Lyfflow is involved in a merger, acquisition, asset sale, or bankruptcy proceeding, your information may be transferred as part of that transaction. We will provide notice before your data becomes subject to a different privacy policy.
          </p>

          <h4 className="font-bold text-lg text-on-surface mt-4 mb-2">9.4.3 Legal Obligations</h4>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-6">
            We may disclose your information if required to do so by law or in good-faith belief that such action is necessary to comply with a legal obligation, protect the rights or safety of Lyfflow, our users, or the public, or respond to a verified government or law enforcement request.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-8">9.5 Security</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-6">
            Lyfflow implements commercially reasonable technical and organizational measures to protect the Service and your data. However, no system is completely secure, and Lyfflow does not warrant that unauthorized access, hacking, data loss, or breaches will never occur.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-8">9.6 Data Retention</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            We retain your account data for the duration of your subscription and for a reasonable period thereafter, as described in our Privacy Policy. Upon account termination, data may be deleted in accordance with our data retention schedule.
          </p>
        </section>

        <section id="service_availability_and_maintenance" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">10. Service Availability and Maintenance</h2>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">10.1 Uptime</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            Lyfflow will use commercially reasonable efforts to maintain Service availability. However, we do not guarantee uninterrupted or error-free operation of the Service.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">10.2 Scheduled Maintenance</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            We may perform scheduled maintenance that temporarily interrupts the Service. Where reasonably practicable, we will provide advance notice of scheduled downtime.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">10.3 No Liability for Downtime</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            Lyfflow shall not be liable for any damages or losses resulting from Service outages, interruptions, or degraded performance, whether scheduled or unscheduled.
          </p>
        </section>

        <section id="suspension_and_termination" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">11. Suspension and Termination</h2>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">11.1 Termination by You</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            You may cancel your subscription and terminate your account at any time through your account dashboard or by contacting support. Termination takes effect at the end of your current billing cycle unless otherwise stated.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">11.2 Suspension or Termination by Lyfflow</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4">
            We reserve the right to suspend or terminate your account, with or without notice, if:
          </p>
          <ul className="space-y-4 text-on-surface-variant ml-4 border-l-2 border-red-500/20 pl-6">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">gavel</span>
              <span className="text-lg">You breach any provision of these Terms;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">gavel</span>
              <span className="text-lg">We determine, in our sole discretion, that your use of the Service poses a risk to us, other users, third parties, or the integrity of the Service;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">gavel</span>
              <span className="text-lg">Required by applicable law or court order;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">gavel</span>
              <span className="text-lg">Your account is inactive for an extended period as defined in our policies.</span>
            </li>
          </ul>
        </section>

        <section id="disclaimers_and_warranties" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">12. Disclaimers and Warranties</h2>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4 uppercase">
            THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY.
          </p>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4 uppercase">
            LYFFLOW DOES NOT WARRANT THAT:
          </p>
          <ul className="space-y-4 text-on-surface-variant ml-4 border-l-2 border-primary/20 pl-6 uppercase">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">warning</span>
              <span className="text-lg">THE SERVICE WILL MEET YOUR SPECIFIC REQUIREMENTS;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">warning</span>
              <span className="text-lg">THE SERVICE WILL OPERATE WITHOUT INTERRUPTION, ERROR, OR DEFECT;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">warning</span>
              <span className="text-lg">AI-GENERATED OUTPUTS WILL BE ACCURATE, COMPLETE, OR APPROPRIATE FOR ANY PARTICULAR USE;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 mt-1">warning</span>
              <span className="text-lg">ANY DEFECTS IN THE SERVICE WILL BE CORRECTED.</span>
            </li>
          </ul>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mt-4 uppercase">
            SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES, SO THE ABOVE EXCLUSIONS MAY NOT APPLY TO YOU.
          </p>
        </section>

        <section id="limitation_of_liability" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">13. Limitation of Liability</h2>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4 uppercase">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL LYFFLOW, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY:
          </p>
          <ul className="space-y-4 text-on-surface-variant ml-4 border-l-2 border-primary/20 pl-6 uppercase">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">shield</span>
              <span className="text-lg">INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">shield</span>
              <span className="text-lg">LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITIES;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">shield</span>
              <span className="text-lg">DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE;</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1">shield</span>
              <span className="text-lg">DAMAGES ARISING FROM UNAUTHORIZED ACCESS TO YOUR ACCOUNT OR DATA;</span>
            </li>
          </ul>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mt-4 uppercase">
            WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STATUTE, OR ANY OTHER LEGAL THEORY, EVEN IF LYFFLOW HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mt-4 uppercase">
            IN ANY CASE, LYFFLOW'S AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS RELATED TO THE SERVICE SHALL NOT EXCEED THE TOTAL AMOUNTS PAID BY YOU TO LYFFLOW IN THE <strong>THREE (3) MONTHS</strong> IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
          </p>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mt-4 uppercase">
            SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS OF LIABILITY, SO THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU.
          </p>
        </section>

        <section id="dispute_resolution" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">14. Dispute Resolution</h2>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">14.1 Informal Resolution</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            Before initiating any formal legal proceeding, you agree to contact Lyfflow at <a href="mailto:legal@lyfflow.com" className="text-primary hover:underline">legal@lyfflow.com</a> and attempt to resolve the dispute informally for at least thirty (30) days.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">14.2 Governing Law</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            These Terms shall be governed by and construed in accordance with the laws of Bangladesh, without regard to its conflict of law provisions.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">14.3 Jurisdiction</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            Any disputes not resolved informally shall be subject to the exclusive jurisdiction of the competent courts located in Dhaka, Bangladesh. You consent to personal jurisdiction in such courts.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">14.4 Class Action Waiver</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            To the extent permitted by law, you waive any right to bring claims against Lyfflow as a plaintiff or class member in any class action, consolidated, or representative proceeding.
          </p>
        </section>

        <section id="confidentiality" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">15. Confidentiality</h2>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            You agree to keep confidential any non-public information about the Service, its technology, pricing, or business that is disclosed to you in the course of using the Service, and not to disclose such information to any third party without our prior written consent.
          </p>
        </section>

        <section id="modifications_to_terms_and_service" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">16. Modifications to Terms and Service</h2>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">16.1 Changes to Terms</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            We reserve the right to modify these Terms at any time. If we make material changes, we will notify you via email or a prominent notice within the Service at least <strong>14 days</strong> before the changes take effect. Your continued use of the Service after the effective date of the updated Terms constitutes your acceptance of the changes.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">16.2 Changes to Service</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light">
            We may modify, suspend, or discontinue any aspect of the Service at any time. We will endeavor to provide reasonable notice of significant changes where practicable.
          </p>
        </section>

        <section id="data_deletion_instructions" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">17. Data Deletion Instructions</h2>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-6">
            You have the right to request deletion of your personal data that Lyfflow has collected through your use of our platform or through your interaction with a Lyfflow-powered platform.
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">17.2 How to submit a deletion request</h3>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-4">
            Send an email to our data privacy team with the subject line <strong>"Data Deletion Request"</strong>. Please include the following in your message:
          </p>
          <ul className="space-y-2 text-on-surface-variant ml-4 border-l-2 border-primary/20 pl-6 text-lg font-light mb-4 list-disc list-inside">
            <li>Your full name</li>
            <li>Your Facebook profile URL or Facebook User ID (if known)</li>
            <li>The name of the business</li>
            <li>A brief description of what you would like deleted</li>
          </ul>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-6">
            Send your request to: <a href="mailto:privacy@lyfflow.com" className="text-primary hover:underline">privacy@lyfflow.com</a>
          </p>

          <h3 className="font-headline text-xl font-bold text-on-surface mb-3 mt-6">17.3 What happens after you submit</h3>
          <div className="bg-surface-container p-6 rounded-2xl border border-surface-variant/30 mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">mark_email_read</span>
              <p className="text-lg text-on-surface-variant font-light"><strong>Acknowledgement:</strong> Within 3 business days</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">delete_sweep</span>
              <p className="text-lg text-on-surface-variant font-light"><strong>Deletion completed:</strong> Within 30 days of request</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">verified</span>
              <p className="text-lg text-on-surface-variant font-light"><strong>Confirmation sent:</strong> Via email once complete</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">database</span>
              <p className="text-lg text-on-surface-variant font-light"><strong>Scope:</strong> All personal data we hold</p>
            </div>
          </div>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light italic">
            ⚠️ Please note: Some data may be retained for a limited period where required by law (e.g., billing records, fraud prevention). We will inform you of any such exceptions in our response.
          </p>
        </section>

        <section id="contact_information" className="scroll-mt-32">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-6">18. Contact Information</h2>
          <p className="text-lg leading-relaxed text-on-surface-variant font-light mb-8">
            For questions about these Terms of Service or Privacy policies, please contact us at:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
            {/* Legal Inquiries Card - Centered */}
            <div className="flex flex-col items-center justify-center gap-3 p-8 bg-surface-container border border-primary/10 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-primary/10 p-4 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">gavel</span>
              </div>
              <a href="mailto:legal@lyfflow.com" className="font-headline text-xl font-bold text-secondary hover:text-primary transition-colors">
                Legal Inquiries
              </a>
            </div>

            {/* Customer Support Card - Centered */}
            <div className="flex flex-col items-center justify-center gap-3 p-8 bg-surface-container border border-primary/10 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-primary/10 p-4 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">support_agent</span>
              </div>
              <a href="mailto:support@lyfflow.com" className="font-headline text-xl font-bold text-secondary hover:text-primary transition-colors">
                Customer Support
              </a>
            </div>

            {/* Website Card - Centered */}
            <div className="flex flex-col items-center justify-center gap-3 p-8 bg-surface-container border border-primary/10 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-primary/10 p-4 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">language</span>
              </div>
              <a href="https://www.lyfflow.com/app" target="_blank" rel="noopener noreferrer" className="font-headline text-xl font-bold text-secondary hover:text-primary transition-colors">
                Website
              </a>
            </div>

            {/* Address Card - Centered with Map Link */}
            <div className="flex flex-col items-center justify-center gap-3 p-8 bg-surface-container border border-primary/10 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-primary/10 p-4 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">location_on</span>
              </div>
              <a href="https://www.google.com/maps/search/?api=1&query=Dhaka+Bangladesh" target="_blank" rel="noopener noreferrer" className="font-headline text-xl font-bold text-secondary hover:text-primary transition-colors">
                Headquarters
              </a>
            </div>
          </div>
        </section>

        {/* Pro Tip Box & Footer Note */}
        <div className="flex flex-col space-y-8 pt-8">
          <div className="p-8 bg-surface-container rounded-2xl border-l-4 border-primary shadow-sm">
            <p className="font-headline text-xl font-bold text-primary mb-2 italic">
              Pro Tip for Enterprise Clients
            </p>
            <p className="text-on-surface-variant">
              Ensure your team has read the full compliance guide before initializing large-scale automated deployments to comply with Meta's messaging policies.
            </p>
          </div>
          <div className="pt-8 text-center border-t border-primary/20">
            <p className="text-lg leading-relaxed text-on-surface-variant font-light italic">
              *By using Lyfflow, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service & Privacy.*
            </p>
          </div>
        </div>

      </article>
    </section>
  );
}
