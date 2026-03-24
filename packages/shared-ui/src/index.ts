// @acroyoga/shared-ui - cross-platform UI components
//
// Component structure:
//   src/Button/
//     Button.tsx          - Shared props, state, logic (headless)
//     index.web.tsx       - Web rendering (Tailwind/HTML)
//     index.native.tsx    - React Native rendering (StyleSheet)
//
// Import pattern:
//   import { Button } from "@acroyoga/shared-ui/Button"
//
// Resolution:
//   - Next.js/webpack → index.web.tsx  (via "default" condition)
//   - Expo/Metro      → index.native.tsx (via "react-native" condition)
//
// Components — re-exported from their web entry points for convenience.
// For platform-specific resolution, import from the subpath directly:
//   import { Button } from "@acroyoga/shared-ui/Button"

// Primitives
export { Button } from "./Button/index.web";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button/Button";

export { Card } from "./Card/index.web";
export type { CardProps, CardVariant } from "./Card/Card";

export { Avatar } from "./Avatar/index.web";
export type { AvatarProps, AvatarSize } from "./Avatar/Avatar";

export { Badge } from "./Badge/index.web";
export type { BadgeProps, BadgeVariant } from "./Badge/Badge";

export { Input } from "./Input/index.web";
export type { InputProps, InputState } from "./Input/Input";

export { LoadingSpinner } from "./LoadingSpinner/index.web";
export type { LoadingSpinnerProps, SpinnerSize } from "./LoadingSpinner/LoadingSpinner";

// Domain cards
export { EventCard } from "./EventCard/index.web";
export type { EventCardProps, EventCardData } from "./EventCard/EventCard";

export { TeacherCard } from "./TeacherCard/index.web";
export type { TeacherCardProps, TeacherCardData } from "./TeacherCard/TeacherCard";

export { DirectoryCard } from "./DirectoryCard/index.web";
export type { DirectoryCardProps, DirectoryCardData } from "./DirectoryCard/DirectoryCard";

export { SocialIcons } from "./SocialIcons/index.web";
export type { SocialIconsProps } from "./SocialIcons/SocialIcons";

export { ProfileCompleteness } from "./ProfileCompleteness/index.web";
export type { ProfileCompletenessProps } from "./ProfileCompleteness/ProfileCompleteness";

// Feedback / states
export { OfflineBanner } from "./OfflineBanner/index.web";
export type { OfflineBannerProps } from "./OfflineBanner/OfflineBanner";

export { EmptyState } from "./EmptyState/index.web";

// Explorer components
export { CategoryLegend } from "./CategoryLegend/index.web";
export type { CategoryLegendProps, WebCategoryLegendProps } from "./CategoryLegend/CategoryLegend";

export { LocationTree } from "./LocationTree/index.web";
export type { LocationTreeProps, WebLocationTreeProps } from "./LocationTree/LocationTree";
export type { EmptyStateProps } from "./EmptyState/EmptyState";

export { Skeleton } from "./Skeleton/index.web";
export type { SkeletonProps, SkeletonVariant } from "./Skeleton/Skeleton";

// Form controls (P1)
export { TextArea } from "./TextArea/index.web";
export type { TextAreaProps, TextAreaState } from "./TextArea/TextArea";

export { Select } from "./Select/index.web";
export type { SelectProps, SelectOption, SelectState } from "./Select/Select";

// Overlays (P1)
export { Modal } from "./Modal/index.web";
export type { ModalProps } from "./Modal/Modal";

export { Toast } from "./Toast/index.web";
export type { ToastProps, ToastVariant } from "./Toast/Toast";
