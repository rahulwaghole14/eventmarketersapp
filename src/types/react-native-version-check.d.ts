declare module 'react-native-version-check' {
  export interface NeedUpdateResponse {
    isNeeded: boolean;
    storeUrl?: string;
    latestVersion?: string;
  }

  export interface NeedUpdateOptions {
    currentVersion?: string;
    latestVersion?: string;
    depth?: number;
    forceUpdate?: boolean;
    provider?: string;
    packageName?: string;
    fetchOptions?: Record<string, any>;
  }

  export interface GetLatestVersionOptions {
    provider?: string;
    packageName?: string;
    fetchOptions?: Record<string, any>;
  }

  const VersionCheck: {
    getCurrentVersion: () => string;
    getCurrentBuildNumber: () => number;
    getPackageName: () => string;
    getLatestVersion: (options?: GetLatestVersionOptions) => Promise<string>;
    needUpdate: (options?: NeedUpdateOptions) => Promise<NeedUpdateResponse>;
    getStoreUrl: (options?: { packageName?: string; appID?: string }) => Promise<string>;
    getAppStoreUrl: (options?: { appID?: string }) => Promise<string>;
    getPlayStoreUrl: (options?: { packageName?: string }) => Promise<string>;
  };

  export default VersionCheck;
}
