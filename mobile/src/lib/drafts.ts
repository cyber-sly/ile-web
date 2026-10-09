import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDraftStore } from "./draftStore";

// The app's listing drafts, kept in AsyncStorage.
export const drafts = createDraftStore(AsyncStorage);
