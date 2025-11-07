export type LocaleKey = 'en' | 'it';

interface LandingFeature {
  title: string;
  description: string;
  bullets: string[];
}

interface LandingModule {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
}

interface LandingTranslations {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  highlights: Array<{ label: string; value: string }>;
  features: LandingFeature[];
  modules: LandingModule[];
  testimonial: {
    quote: string;
    author: string;
    role: string;
  };
  secondaryCta: {
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
}

interface AuthScreenCopy {
  title: string;
  subtitle: string;
  successTitle?: string;
  successDescription?: string;
  form: {
    emailLabel?: string;
    passwordLabel?: string;
    confirmPasswordLabel?: string;
    otpLabel?: string;
    firstNameLabel?: string;
    lastNameLabel?: string;
    submit: string;
    cta?: string;
  };
  links?: {
    primary: { href: string; label: string };
    secondary?: { href: string; label: string };
  };
  success?: {
    title: string;
    description: string;
    actionLabel: string;
  };
}

export interface AppTranslations {
  app: {
    name: string;
    tagline: string;
  };
  nav: {
    product: string;
    features: string;
    automation: string;
    resources: string;
    login: string;
    register: string;
  };
  common: {
    loading: string;
    getStarted: string;
    contactSales: string;
    signIn: string;
    createAccount: string;
    backToLogin: string;
    continue: string;
    cancel: string;
    send: string;
    compose: string;
    refresh: string;
    otpPlaceholder: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    confirmPasswordPlaceholder: string;
    searchPlaceholder: string;
    genericError: string;
    passwordMismatch: string;
    invalidToken: string;
    search: string;
  };
  landing: LandingTranslations;
  auth: {
    login: AuthScreenCopy;
    otp: AuthScreenCopy;
    register: AuthScreenCopy;
    forgotPassword: AuthScreenCopy;
    resetPassword: AuthScreenCopy;
  };
  dashboard: {
    email: {
      title: string;
      descriptionTemplate: string;
      searchPlaceholder: string;
      noProviders: string;
      selectEmail: string;
      bulkBar: {
        selected: string;
        markUnread: string;
        markRead: string;
        delete: string;
        selectAll: string;
        clear: string;
      };
    };
    emailList: {
      loading: string;
      empty: string;
      threads: { singular: string; plural: string };
      inboxLabel: string;
    };
    emailView: {
      folderLabel: string;
      attachments: string;
      to: string;
      cc: string;
      labels: string;
      date: string;
      selectEmail: string;
      reply: string;
      forward: string;
      summaryTitle: string;
      summaryGenerate: string;
      summaryRegenerate: string;
      summaryEmpty: string;
      smartRepliesTitle: string;
      smartRepliesLoading: string;
      smartRepliesEmpty: string;
      labelTitle: string;
      labelEmpty: string;
    };
  };
}

export const translations: Record<LocaleKey, AppTranslations> = {
  en: {
    app: {
      name: 'MailAgent',
      tagline: 'AI-native workspace for mission critical email',
    },
    nav: {
      product: 'Product',
      features: 'Features',
      automation: 'Automation',
      resources: 'Resources',
      login: 'Sign in',
      register: 'Create account',
    },
    common: {
      loading: 'Loading...',
      getStarted: 'Get started',
      contactSales: 'Contact sales',
      signIn: 'Sign in',
      createAccount: 'Create account',
      backToLogin: 'Back to login',
      continue: 'Continue',
      cancel: 'Cancel',
      send: 'Send',
      compose: 'Compose',
      refresh: 'Refresh',
      otpPlaceholder: '000000',
      emailPlaceholder: 'you@company.com',
      passwordPlaceholder: 'Enter your password',
      confirmPasswordPlaceholder: 'Repeat your password',
      searchPlaceholder: 'Search emails, people, or labels...',
      genericError: 'Something went wrong. Please try again.',
      passwordMismatch: 'Passwords do not match.',
      invalidToken: 'Invalid or expired reset token.',
      search: 'Search',
    },
    landing: {
      hero: {
        eyebrow: 'AI-native communications layer',
        title: 'Orchestrate every inbox with confidence',
        subtitle:
          'MailAgent blends intelligent triage, automated drafting, and voice-ready copilots so every response is on brand and on time.',
        primaryCta: 'Book a live demo',
        secondaryCta: 'See the platform',
      },
      highlights: [
        { label: 'Faster responses', value: '2.4×' },
        { label: 'Manual triage reduced', value: '-63%' },
        { label: 'Playbooks automated', value: '180+' },
      ],
      features: [
        {
          title: 'Unified material inbox',
          description: 'Blend Gmail, Outlook, and IMAP accounts into a single material design workspace.',
          bullets: [
            'Adaptive theming for light & dark environments',
            'Enterprise labels, filters, and retention controls',
            'Context-rich profile cards for every sender',
          ],
        },
        {
          title: 'AI drafting that sounds like you',
          description: 'Guided prompts, tone controls, and approval flows keep humans in the loop.',
          bullets: [
            'Reusable templates with live variables',
            'Voice-to-email and audio playback',
            'Compliance friendly audit history',
          ],
        },
        {
          title: 'Operations grade analytics',
          description: 'Reveal SLA risk, queue volume, and automation impact in real time.',
          bullets: [
            'Smart alerts for VIP accounts',
            'Monte Carlo forecasting for queues',
            'Embedded dashboards for every team lead',
          ],
        },
      ],
      modules: [
        {
          eyebrow: 'Intelligent triage',
          title: 'Score every thread automatically',
          description:
            'Custom models learn what matters to your teams, then route email to AI or humans with confidence levels.',
          items: ['Sentiment & urgency detection', 'Queue balancing automations', 'Playbook suggestions'],
        },
        {
          eyebrow: 'Connected ecosystem',
          title: 'Built for enterprise reality',
          description:
            'Deep integrations with Google Workspace, Microsoft 365, Exchange, and any IMAP/SMTP or CalDAV source.',
          items: ['SOC 2 & ISO controls', 'Granular role-based access', 'Audit-ready logging'],
        },
      ],
      testimonial: {
        quote:
          'MailAgent let our 70-person support org operate like 200. The AI assistant drafts perfect replies, while the dashboard shows exactly where human focus is needed.',
        author: 'Chiara Leone',
        role: 'Head of Service Operations, Aeris',
      },
      secondaryCta: {
        title: 'Ready for a material refresh of your email ops?',
        subtitle: 'Bring every workflow into a single AI-native workspace with MailAgent.',
        primaryCta: 'Talk to product',
        secondaryCta: 'Download one-pager',
      },
    },
    auth: {
      login: {
        title: 'Welcome back',
        subtitle: 'Secure authentication with MFA and session guardrails.',
        form: {
          emailLabel: 'Work email',
          passwordLabel: 'Password',
          submit: 'Sign in',
          cta: 'Need an account?',
        },
        links: {
          primary: { href: '/auth/register', label: 'Create an account' },
          secondary: { href: '/auth/forgot-password', label: 'Forgot password?' },
        },
      },
      otp: {
        title: 'Verify the one-time code',
        subtitle: 'Check your inbox for a 6-digit security code.',
        form: {
          otpLabel: 'One-time code',
          submit: 'Verify & continue',
        },
        links: {
          primary: { href: '/auth/login', label: 'Back to login' },
        },
      },
      register: {
        title: 'Create your workspace',
        subtitle: 'Provision your first inbox in less than two minutes.',
        form: {
          firstNameLabel: 'First name',
          lastNameLabel: 'Last name',
          emailLabel: 'Work email',
          passwordLabel: 'Password',
          confirmPasswordLabel: 'Confirm password',
          submit: 'Create account',
        },
        links: {
          primary: { href: '/auth/login', label: 'Already have an account? Sign in' },
        },
      },
      forgotPassword: {
        title: 'Reset your password',
        subtitle: 'We will send a secure link to your email address.',
        form: {
          emailLabel: 'Work email',
          submit: 'Send reset link',
        },
        success: {
          title: 'Check your inbox',
          description: 'If an account exists we just sent you a secure link.',
          actionLabel: 'Back to login',
        },
      },
      resetPassword: {
        title: 'Choose a new password',
        subtitle: 'Your password must be at least 12 characters.',
        form: {
          passwordLabel: 'New password',
          confirmPasswordLabel: 'Confirm password',
          submit: 'Update password',
        },
        success: {
          title: 'Password updated',
          description: 'You can now sign in with your new credentials.',
          actionLabel: 'Go to login',
        },
      },
    },
    dashboard: {
      email: {
        title: 'Inbox control center',
        descriptionTemplate: '{count} unread conversations — stay focused on the work that matters.',
        searchPlaceholder: 'Search threads, senders, or labels',
        noProviders: 'Connect a mail provider to send and receive email.',
        selectEmail: 'Select a conversation to start collaborating.',
        bulkBar: {
          selected: '{count} selected',
          markUnread: 'Mark unread',
          markRead: 'Mark read',
          delete: 'Delete',
          selectAll: 'Select all',
          clear: 'Clear selection',
        },
      },
      emailList: {
        loading: 'Loading emails...',
        empty: 'No emails match your filters.',
        threads: { singular: 'thread', plural: 'threads' },
        inboxLabel: 'Inbox',
      },
      emailView: {
        folderLabel: 'Folder',
        attachments: 'Attachments',
        to: 'To',
        cc: 'Cc',
        labels: 'Labels',
        date: 'Date',
        selectEmail: 'Select an email to preview the full thread.',
        reply: 'Reply',
        forward: 'Forward',
        summaryTitle: 'AI summary',
        summaryGenerate: 'Generate summary',
        summaryRegenerate: 'Refresh summary',
        summaryEmpty: 'Ask the Copilot to explain this conversation.',
        smartRepliesTitle: 'Smart replies',
        smartRepliesLoading: 'Fetching smart replies...',
        smartRepliesEmpty: 'No smart replies available yet.',
        labelTitle: 'Suggested labels',
        labelEmpty: 'AI suggested labels will appear here.',
      },
    },
  },
  it: {
    app: {
      name: 'MailAgent',
      tagline: 'Workspace AI per le email mission critical',
    },
    nav: {
      product: 'Prodotto',
      features: 'Funzionalità',
      automation: 'Automazioni',
      resources: 'Risorse',
      login: 'Accedi',
      register: 'Crea account',
    },
    common: {
      loading: 'Caricamento...',
      getStarted: 'Inizia ora',
      contactSales: 'Contatta il team',
      signIn: 'Accedi',
      createAccount: 'Crea account',
      backToLogin: 'Torna al login',
      continue: 'Continua',
      cancel: 'Annulla',
      send: 'Invia',
      compose: 'Scrivi',
      refresh: 'Aggiorna',
      otpPlaceholder: '000000',
      emailPlaceholder: 'nome@azienda.com',
      passwordPlaceholder: 'Inserisci la password',
      confirmPasswordPlaceholder: 'Ripeti la password',
      searchPlaceholder: 'Cerca email, persone o etichette...',
      genericError: 'Qualcosa è andato storto. Riprova.',
      passwordMismatch: 'Le password non coincidono.',
      invalidToken: 'Token di ripristino non valido o scaduto.',
      search: 'Cerca',
    },
    landing: {
      hero: {
        eyebrow: 'Piattaforma AI per le comunicazioni',
        title: 'Controlla ogni inbox con serenità',
        subtitle:
          'MailAgent unisce triage intelligente, bozze automatiche e assistenti vocali per risposte puntuali e coerenti.',
        primaryCta: 'Richiedi una demo',
        secondaryCta: 'Scopri il prodotto',
      },
      highlights: [
        { label: 'Risposte più rapide', value: '2,4×' },
        { label: 'Triage manuale ridotto', value: '-63%' },
        { label: 'Playbook automatizzati', value: '180+' },
      ],
      features: [
        {
          title: 'Inbox unificata',
          description: 'Integra Gmail, Outlook e ogni account IMAP in un’unica interfaccia Material.',
          bullets: [
            'Tema adattivo chiaro/scuro',
            'Etichette e filtri enterprise',
            'Schede profilo con contesto completo',
          ],
        },
        {
          title: 'Bozze AI personalizzate',
          description: 'Prompt guidati, controllo del tono e flussi di approvazione.',
          bullets: [
            'Template riutilizzabili con variabili',
            'Dettatura vocale e lettura audio',
            'Storico audit conforme',
          ],
        },
        {
          title: 'Analisi operative',
          description: 'Metriche SLA, volumi di coda e impatto delle automazioni in tempo reale.',
          bullets: [
            'Avvisi smart per account VIP',
            'Previsioni sulle code',
            'Dashboard per ogni team leader',
          ],
        },
      ],
      modules: [
        {
          eyebrow: 'Triage intelligente',
          title: 'Valuta ogni conversazione automaticamente',
          description:
            'Modelli personalizzati apprendono le tue priorità e indirizzano il thread verso AI o persone.',
          items: [
            'Rilevazione di sentiment e urgenza',
            'Bilanciamento automatico delle code',
            'Suggerimenti di playbook',
          ],
        },
        {
          eyebrow: 'Ecosistema connesso',
          title: 'Pronto per l’impresa',
          description:
            'Integrazioni profonde con Google Workspace, Microsoft 365 e qualsiasi fonte IMAP/SMTP o CalDAV.',
          items: ['Controlli SOC 2 e ISO', 'Permessi granulari', 'Log per audit completi'],
        },
      ],
      testimonial: {
        quote:
          'MailAgent ha permesso al nostro supporto di 70 persone di lavorare come se fossimo in 200. L’assistente AI scrive bozze perfette mentre il cruscotto evidenzia dove serve l’intervento umano.',
        author: 'Chiara Leone',
        role: 'Head of Service Operations, Aeris',
      },
      secondaryCta: {
        title: 'Pronti a ridisegnare le vostre email?',
        subtitle: 'Porta ogni flusso di lavoro in un workspace AI-native con MailAgent.',
        primaryCta: 'Parla con il prodotto',
        secondaryCta: 'Scarica la scheda',
      },
    },
    auth: {
      login: {
        title: 'Bentornato',
        subtitle: 'Accesso protetto con MFA e controlli di sessione.',
        form: {
          emailLabel: 'Email aziendale',
          passwordLabel: 'Password',
          submit: 'Accedi',
          cta: 'Ti serve un account?',
        },
        links: {
          primary: { href: '/auth/register', label: 'Crea un account' },
          secondary: { href: '/auth/forgot-password', label: 'Password dimenticata?' },
        },
      },
      otp: {
        title: 'Verifica il codice',
        subtitle: 'Controlla la tua casella per il codice di sicurezza a 6 cifre.',
        form: {
          otpLabel: 'Codice temporaneo',
          submit: 'Verifica e continua',
        },
        links: {
          primary: { href: '/auth/login', label: 'Torna al login' },
        },
      },
      register: {
        title: 'Crea il tuo workspace',
        subtitle: 'Configura la prima inbox in meno di due minuti.',
        form: {
          firstNameLabel: 'Nome',
          lastNameLabel: 'Cognome',
          emailLabel: 'Email aziendale',
          passwordLabel: 'Password',
          confirmPasswordLabel: 'Conferma password',
          submit: 'Crea account',
        },
        links: {
          primary: { href: '/auth/login', label: 'Hai già un account? Accedi' },
        },
      },
      forgotPassword: {
        title: 'Reimposta la password',
        subtitle: 'Ti invieremo un link sicuro via email.',
        form: {
          emailLabel: 'Email aziendale',
          submit: 'Invia link di reset',
        },
        success: {
          title: 'Controlla la posta',
          description: 'Se l’account esiste abbiamo spedito un link di ripristino.',
          actionLabel: 'Torna al login',
        },
      },
      resetPassword: {
        title: 'Imposta una nuova password',
        subtitle: 'La password deve contenere almeno 12 caratteri.',
        form: {
          passwordLabel: 'Nuova password',
          confirmPasswordLabel: 'Conferma password',
          submit: 'Aggiorna password',
        },
        success: {
          title: 'Password aggiornata',
          description: 'Ora puoi accedere con le nuove credenziali.',
          actionLabel: 'Vai al login',
        },
      },
    },
    dashboard: {
      email: {
        title: 'Control room della posta',
        descriptionTemplate: '{count} conversazioni non lette — concentrati su ciò che conta.',
        searchPlaceholder: 'Cerca conversazioni, mittenti o etichette',
        noProviders: 'Collega un provider per inviare e ricevere email.',
        selectEmail: 'Seleziona una conversazione per iniziare a collaborare.',
        bulkBar: {
          selected: '{count} elementi',
          markUnread: 'Segna come non letto',
          markRead: 'Segna come letto',
          delete: 'Elimina',
          selectAll: 'Seleziona tutto',
          clear: 'Cancella selezione',
        },
      },
      emailList: {
        loading: 'Caricamento email...',
        empty: 'Nessuna email corrisponde ai filtri.',
        threads: { singular: 'thread', plural: 'thread' },
        inboxLabel: 'Posta in arrivo',
      },
      emailView: {
        folderLabel: 'Cartella',
        attachments: 'Allegati',
        to: 'A',
        cc: 'Cc',
        labels: 'Etichette',
        date: 'Data',
        selectEmail: 'Seleziona un’email per vedere l’intera conversazione.',
        reply: 'Rispondi',
        forward: 'Inoltra',
        summaryTitle: 'Riassunto AI',
        summaryGenerate: 'Genera riassunto',
        summaryRegenerate: 'Rigenera riassunto',
        summaryEmpty: 'Chiedi al Copilot di spiegare questa conversazione.',
        smartRepliesTitle: 'Risposte suggerite',
        smartRepliesLoading: 'Recupero delle risposte suggerite...',
        smartRepliesEmpty: 'Nessuna risposta suggerita al momento.',
        labelTitle: 'Etichette suggerite',
        labelEmpty: 'Qui appariranno le etichette proposte dall’AI.',
      },
    },
  },
};

export const resolveLocale = (value?: string | null): LocaleKey => {
  if (value?.toLowerCase().startsWith('it')) {
    return 'it';
  }
  return 'en';
};

export const getTranslations = (value?: string | null): AppTranslations => {
  const locale = resolveLocale(value);
  return translations[locale];
};

export type { LandingFeature, LandingModule, LandingTranslations, AuthScreenCopy };
