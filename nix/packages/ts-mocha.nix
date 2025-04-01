{ pkgs, ... }:

pkgs.buildNpmPackage (finalAttrs: {
  pname = "ts-mocha";
  version = "11.1.0";

  src = pkgs.fetchFromGitHub {
    owner = "piotrwitek";
    repo = "ts-mocha";
    tag = "v${finalAttrs.version}";
    hash = "sha256-4l1ze1Bi9TPvgwLc5RteXbOhLE/K8zeDyXIPpm+Whzg=";
  };

  npmDepsHash = "sha256-ZEmhtteEa5fHFDdojGKtPQ2T4nCkevmEnRtWK/D6QCM=";

  dontNpmBuild = true;

  nativeBuildInputs = [
    pkgs.makeBinaryWrapper
  ];

  postInstall = ''
    wrapProgram "$out/bin/ts-mocha" \
      --prefix NODE_PATH : ${pkgs.nodePackages.mocha}/lib/node_modules \
      --prefix NODE_PATH : ${pkgs.nodePackages.ts-node}/lib/node_modules
  '';
})
