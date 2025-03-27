{ pkgs, perSystem, ... }:

perSystem.devshell.mkShell {
  packages = [
    pkgs.pnpm
    pkgs.typescript
    pkgs.nodePackages.ts-node
    pkgs.mkdocs
  ];
}
