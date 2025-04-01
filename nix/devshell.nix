{ pkgs, perSystem, ... }:

perSystem.devshell.mkShell {
  packages = [
    pkgs.pnpm
    pkgs.nodejs
    pkgs.typescript
    pkgs.nodePackages.ts-node
    perSystem.self.ts-mocha
    pkgs.mkdocs
  ];
}
