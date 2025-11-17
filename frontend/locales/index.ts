export type LocaleKey = 'en' | 'it';
import { appTranslations } from './app-translations';


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
    save: string;
    delete: string;
    edit: string;
    close: string;
    confirm: string;
    yes: string;
    no: string;
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
    index: {
      loading: string;
      redirecting: string;
    };
    email: {
      title: string;
      descriptionTemplate: string;
      searchPlaceholder: string;
      noProviders: string;
      selectEmail: string;
      allAccountsLabel: string;
      starredFolderLabel: string;
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
      smartRepliesGenerate: string;
      smartRepliesRegenerate: string;
      smartRepliesLoading: string;
      smartRepliesEmpty: string;
      labelTitle: string;
      labelEmpty: string;
      memoryTitle: string;
      memoryDescription: string;
      memoryPlaceholder: string;
      memoryGenerate: string;
      memoryRegenerate: string;
      memoryLoading: string;
      memoryEmpty: string;
      memoryCopy: string;
      memoryCopied: string;
      memoryUse: string;
      memoryQueryRequired: string;
      memorySourceEmail: string;
      memorySourceDocument: string;
      memoryConfidenceLabel: string;
      memoryConfidenceHigh: string;
      memoryConfidenceMedium: string;
      memoryConfidenceLow: string;
      memoryUnknownSender: string;
      memoryLastQueryPrefix: string;
      memoryCopyError: string;
      memoryError: string;
    };
    calendar: {
      title: string;
      description: string;
      refreshTooltip: string;
      allCalendars: string;
      clearSelection: string;
      filterTitle?: string;
      noProviders: string;
      noProvidersDescription: string;
      loading: string;
      createEvent: string;
      editEvent: string;
      deleteEvent: string;
      deleteConfirm: string;
      eventDetails: string;
      startTime: string;
      endTime: string;
      location: string;
      eventDescription: string;
      attendees: string;
      saveEvent: string;
      cancelEvent: string;
    };
    providers: {
      title: string;
      descriptionTemplate: string;
      refresh: string;
      connectedTab: string;
      addTab: string;
      connectedTitle: string;
      connectedDescription: string;
      loading: string;
      googleTitle: string;
      googleDescription: string;
      googleConnect: string;
      microsoftTitle: string;
      microsoftDescription: string;
      microsoftConnect: string;
      genericTitle: string;
      genericDescription: string;
      genericConnect: string;
      helpTitle: string;
      helpGoogle: string;
      helpMicrosoft: string;
      helpGeneric: string;
      commonSettingsTitle: string;
      successMessage: string;
      deleteSuccess: string;
      deleteConfirm: string;
      oauthError: string;
    };
    settings: {
      title: string;
      description: string;
      preferences: string;
      profileTitle: string;
      profileDescription: string;
      firstName: string;
      lastName: string;
      emailReadonly: string;
      saving: string;
      saveChanges: string;
      successMessage: string;
      providersTitle: string;
      providersDescription: string;
      manageProviders: string;
      dangerZoneTitle: string;
      dangerZoneDescription: string;
      dangerZoneWarning: string;
      deleteAccount: string;
      deleting: string;
      deleteConfirm: string;
      sections: {
        general: string;
        ai: string;
        accounts: string;
        account: string;
        notifications: string;
      };
      generalPanel: {
        title: string;
        description: string;
        appearanceTitle: string;
        themeLabel: string;
        themeHint: string;
        languageTitle: string;
        languageLabel: string;
        languageHint: string;
        timezoneLabel: string;
        notificationsTitle: string;
        notificationsDescription: string;
        reset: string;
        save: string;
      };
      mailAccountsPanel: {
        title: string;
        description: string;
        empty: string;
        manage: string;
        defaultBadge: string;
        emailBadge: string;
        calendarBadge: string;
        contactsBadge: string;
        lastSyncPrefix: string;
        neverSynced: string;
        providerTypes: Record<string, string>;
      };
      aiPanel: {
        title: string;
        description: string;
        smartReplies: string;
        smartRepliesDescription: string;
        summarization: string;
        summarizationDescription: string;
        scheduling: string;
        schedulingDescription: string;
        save: string;
      };
      accountPanel: {
        title: string;
        description: string;
        profileInformation: string;
        fullName: string;
        email: string;
        role: string;
        readOnlyNotice: string;
        dangerTitle: string;
        dangerDescription: string;
        deleteCta: string;
      };
      notificationsPanel: {
        title: string;
        description: string;
        emailToggle: string;
      };
    };
    folders: {
      all: string;
      inbox: string;
      sent: string;
      drafts: string;
      trash: string;
      spam: string;
      archive: string;
      outbox: string;
      starred: string;
    };
    composer: {
      title: string;
      titleReply: string;
      titleForward: string;
      from: string;
      to: string;
      cc: string;
      bcc: string;
      subject: string;
      bodyLabel: string;
      attachFiles: string;
      removeAttachment: string;
      formatting: string;
      bold: string;
      italic: string;
      bulletList: string;
      numberedList: string;
      link: string;
      send: string;
      saveDraft: string;
      sending: string;
      saving: string;
      selectProvider: string;
      validationTo: string;
      validationSubject: string;
      sendError: string;
      draftSaved: string;
    };
    contacts: {
      title: string;
      description: string;
      searchPlaceholder: string;
      companyPlaceholder: string;
      providerFilterLabel: string;
      allProvidersLabel: string;
      applyFilters: string;
      clearFilters: string;
      refresh: string;
      sync: string;
      syncing: string;
      syncDisabledTooltip: string;
      list: {
        emptyTitle: string;
        emptyDescription: string;
        loading: string;
        showing: string;
        tableHeaders: {
          name: string;
          email: string;
          phone: string;
          company: string;
          provider: string;
          lastSynced: string;
          actions: string;
        };
      };
      alerts: {
        loadError: string;
        syncSuccess: string;
        syncError: string;
        deleteConfirmTitle: string;
        deleteConfirmDescription: string;
        deleteSuccess: string;
        deleteError: string;
      };
      editDialog: {
        title: string;
        description: string;
        firstName: string;
        lastName: string;
        displayName: string;
        email: string;
        phone: string;
        company: string;
        jobTitle: string;
        save: string;
        cancel: string;
        success: string;
        error: string;
      };
    };
  };
  errors: {
    notFound: {
      title: string;
      subtitle: string;
      description: string;
      action: string;
    };
    serverError: {
      title: string;
      subtitle: string;
      description: string;
      action: string;
    };
  };
}

const translations: Record<LocaleKey, AppTranslations> = appTranslations;

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
