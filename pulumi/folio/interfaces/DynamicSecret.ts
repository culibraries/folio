// Typescript requires this if we want to add additional properties to an object
// which was already created. This pattern is an "index signature" in typescript
// for when we don't know all the props ahead of time.
export interface DynamicSecret {
    [key: string]: any;
}
