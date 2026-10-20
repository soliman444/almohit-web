import { SHOT } from "../../lib/content/shots";
import { ButtonLink } from "./button-link";
import { ImageShot } from "./image-shot";

export function SourcingStory({
  src,
  title = "Selected at the source. Ready for your business.",
  copy = "Fruit chosen when it is ready to move, then packed for the next drop.",
}: {
  src?: string;
  title?: string;
  copy?: string;
}) {
  return (
    <section className="sf-source" id="story">
      <div className="sf-source-media">
        <ImageShot src={src || SHOT.citrusMacro} alt="" sizes="80vw" preset="campaign" className="sf-fill" />
      </div>
      <div className="sf-source-copy">
        <h2>{title}</h2>
        <p>{copy}</p>
        <ButtonLink href="/about" ghost>Read our story</ButtonLink>
      </div>
    </section>
  );
}
