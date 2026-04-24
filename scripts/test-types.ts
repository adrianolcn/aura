export type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

export type TestGroup = {
  name: string;
  cases: TestCase[];
};
