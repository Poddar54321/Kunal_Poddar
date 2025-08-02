import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  subscriber: {
    type: Schema.Types.ObjectId, // one who is subscribing
    ref: "User",
  },
  channel: {
    type: Schema.Types.ObjectId, // the channel being subscribed to   
    ref: "User",
  },
});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
