name := "resy-booking-bot"

scalaVersion := "2.13.8"

ThisBuild / scalafixDependencies ++= Seq(
  "com.github.vovapolu" %% "scaluzzi"         % "0.1.23",
  "org.scalatest"       %% "autofix"          % "3.1.0.1",
  "com.eed3si9n.fix"    %% "scalafix-noinfer" % "0.1.0-M1"
)

lazy val root = Project("resy-booking-bot", file("."))
  .settings(
    semanticdbEnabled := true,
    scalafixOnCompile := true,
    scalacOptions += "-Ywarn-unused",
    libraryDependencies ++= Seq(
      "com.typesafe.play"          %% "play-ahc-ws"     % "2.8.18",
      "com.github.pureconfig"      %% "pureconfig"      % "0.17.4",
      "com.typesafe.scala-logging" %% "scala-logging"   % "3.9.5",
      "ch.qos.logback"              % "logback-classic" % "1.4.11",
      "org.apache.commons"          % "commons-lang3"   % "3.12.0",
      "org.scalatest"              %% "scalatest"       % "3.2.15" % Test,
      "org.mockito"                 % "mockito-core"    % "5.1.1"  % Test
    )
  )

assembly / assemblyMergeStrategy := {
  case PathList("module-info.class") => MergeStrategy.discard
  case x                             => (assembly / assemblyMergeStrategy).value(x)
}
