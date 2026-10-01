import { TFunction } from 'i18next';

export interface BaseScreenProps {
  insets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  t: TFunction;
}
