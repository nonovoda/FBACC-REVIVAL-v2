export const createActionExecutors = ({ modules, accessToken, context, logDebug }) => {
  const {
    accountsModule,
    billingModule,
    businessesModule,
    pagesModule,
    diagnosticsModule
  } = modules;

  return {
    'accounts.load_snapshot': async () => accountsModule.load({ accessToken }),
    'billing.load_snapshot': async () => billingModule.load({ accessToken, context, logDebug }),
    'businesses.load_snapshot': async () => businessesModule.load({ accessToken }),
    'pages.load_snapshot': async () => pagesModule.load({ accessToken }),
    'diagnostics.load_snapshot': async () => diagnosticsModule.load({ accessToken })
  };
};
