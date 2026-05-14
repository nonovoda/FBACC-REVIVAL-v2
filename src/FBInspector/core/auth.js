const getFromAdsContext = () => {
  const candidate = window?.require?.('AdsPEMainAppState')?.getState?.();
  if (!candidate) {
    return null;
  }

  return {
    accessToken: candidate.accessToken ?? null,
    userId: candidate.viewer?.id ?? null,
    adAccountId: candidate.selectedAccountID ?? null
  };
};

const safeDomTokenScan = () => {
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const text = script.textContent || '';
    const match = text.match(/EA[A-Za-z0-9]{20,}/);
    if (match) {
      return match[0];
    }
  }
  return null;
};

export const authService = {
  getAccessToken() {
    if (typeof window.__accessToken === 'string' && window.__accessToken.length > 20) {
      return window.__accessToken;
    }

    const adsContext = getFromAdsContext();
    if (adsContext?.accessToken) {
      return adsContext.accessToken;
    }

    return safeDomTokenScan();
  },

  getCurrentUserId() {
    const adsContext = getFromAdsContext();
    return window?.CurrentUserInitialData?.USER_ID ?? adsContext?.userId ?? null;
  },

  getCurrentAdAccountId() {
    const adsContext = getFromAdsContext();
    return adsContext?.adAccountId ?? null;
  },

  getDtsg() {
    return window?.DTSGInitialData?.token ?? null;
  },

  getSiteData() {
    return window?.SiteData ?? null;
  }
};
