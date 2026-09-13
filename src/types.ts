export interface NFTItem {
  address: string;
  index: number;
  owner?: {
    address: string;
  };
  metadata: {
    name: string;
    description?: string;
    image: string;
    lottie?: string;
    lottie_url?: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
  };
}
