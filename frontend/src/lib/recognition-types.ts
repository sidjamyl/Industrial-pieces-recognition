export type CropBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DetectionResponse = {
  detected: boolean;
  image_size: [number, number];
  box: [number, number, number, number];
};

export type RankingItem = {
  reference: string;
  score: number;
};

export type Neighbor = {
  image_url: string;
  reference: string;
  specimen: string;
  side: string;
  similarity: number;
};

export type PredictionResponse = {
  winner: string;
  margin: number;
  ranking: RankingItem[];
  pedagogy: {
    source_size: [number, number];
    crop_size: [number, number];
    crop_data_url: string;
    tensor: {
      shape: number[];
      minimum: number;
      maximum: number;
      mean: number;
    };
    embedding: {
      dimensions: number;
      norm: number;
      values: number[];
    };
    neighbors: Neighbor[];
    score_formula: string;
    final_score: number;
  };
};
