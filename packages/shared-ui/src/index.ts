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
export { Button } from "./Button/index.web.js";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button/Button.js";

export { Card } from "./Card/index.web.js";
export type { CardProps, CardVariant } from "./Card/Card.js";

export { Avatar } from "./Avatar/index.web.js";
export type { AvatarProps, AvatarSize } from "./Avatar/Avatar.js";

export { Badge } from "./Badge/index.web.js";
export type { BadgeProps, BadgeVariant } from "./Badge/Badge.js";

export { Input } from "./Input/index.web.js";
export type { InputProps, InputState } from "./Input/Input.js";

export { LoadingSpinner } from "./LoadingSpinner/index.web.js";
export type { LoadingSpinnerProps, SpinnerSize } from "./LoadingSpinner/LoadingSpinner.js";

// Domain cards
export { EventCard } from "./EventCard/index.web.js";
export type { EventCardProps, EventCardData } from "./EventCard/EventCard.js";

export { TeacherCard } from "./TeacherCard/index.web.js";
export type { TeacherCardProps, TeacherCardData } from "./TeacherCard/TeacherCard.js";

// Feedback / states
export { OfflineBanner } from "./OfflineBanner/index.web.js";
export type { OfflineBannerProps } from "./OfflineBanner/OfflineBanner.js";

export { EmptyState } from "./EmptyState/index.web.js";
export type { EmptyStateProps } from "./EmptyState/EmptyState.js";

export { Skeleton } from "./Skeleton/index.web.js";
export type { SkeletonProps, SkeletonVariant } from "./Skeleton/Skeleton.js";

// Form controls (P1)
export { TextArea } from "./TextArea/index.web.js";
export type { TextAreaProps, TextAreaState } from "./TextArea/TextArea.js";

export { Select } from "./Select/index.web.js";
export type { SelectProps, SelectOption, SelectState } from "./Select/Select.js";

// Overlays (P1)
export { Modal } from "./Modal/index.web.js";
export type { ModalProps } from "./Modal/Modal.js";

export { Toast } from "./Toast/index.web.js";
export type { ToastProps, ToastVariant } from "./Toast/Toast.js";
