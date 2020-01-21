# NPJ

`npj` (**np**m **j**umper) acts as a global bridge between all your npm projects.

## Installation
```sh
npm i -g https://github.com/austinbillings/npj.git
```

## Overview

`npj` makes use of a per-user local "registry" to keep track of _which_ NPM packages are in development are in development _where_ on your machine. This also allows it to easily run scripts from any registered package, triggerable from any directory on your system.

The file used by `npj` to store your registry lives at `~/.npj-registry`, and its contents are a plain JSON object which maps `projectName` keys to `packageDirPath` values.

## Usage

### See help
```sh
npj --help
```

---

### Register a package
```sh
cd my-project # anything with a package.json will do
npj add
```

```
[NPJ] ✓ OK:    my-project -> /Users/admin/code/my-project @0.0.1
```

---

### Show registered packages
```sh
npj ls
```

```
[NPJ] «package»  my-project @0.0.1
[NPJ] >>>>       -->--> /Users/admin/code/my-project
```

---

### Add another package
```sh
cd ../some-other-project
npj add
```


```
[NPJ] ✓ OK:    some-other-project -> /Users/admin/code/some-other-project @1.0.3
```

Listing packages afterward (`npj ls`):
```
[NPJ] «package»  my-project @0.0.1
[NPJ] >>>>       -->--> /Users/admin/code/my-project
[NPJ] «package»  some-other-project @1.0.3
[NPJ] >>>>       -->--> /Users/admin/code/some-other-project
```

### Remove from registry
```
cd my-project
npj remove
```


```
[NPJ] ✓ OK:    Removed "some-other-project" from registry
```

---

### List scripts offered by a registered package

```sh
npj scripts my-package
```



```
[NPJ] «package»  my-package @0.0.1
[NPJ] >>>>       -->--> /Users/admin/code/my-package
[NPJ] «script»   test
[NPJ] >>>>          node tests/all.js
[NPJ] «script»   build
[NPJ] >>>>          node build.js
```


---

### Run a registered package's script (or multiple!)
When multiple `<packageName>:<scriptName>` sets are provided, they are run in sequence (not parallel!)

```sh
npj my-project:build my-project:test
```


```
[NPJ] «script»   my-project: Running script «build»

> my-project@0.0.1 build /Users/admin/code/my-project
> node build.js
...
[NPJ] «script»   script process exited with code 0
[NPJ] «script»   my-project: Running script «test»

> my-project@0.0.1 test /Users/admin/code/my-project
> node tests/all.js
...
[NPJ] «script»   script process exited with code 0
```
