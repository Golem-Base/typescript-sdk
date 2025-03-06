{ pkgs, perSystem, ... }:

perSystem.devshell.mkShell {
  packages = [
    pkgs.pnpm
  ];
}
