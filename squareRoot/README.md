# squareRoot

An interactive visualiser for Heron's method (also called the Babylonian method) of computing √n.

Starting from any positive guess x₀:

    x(k+1) = ½ · ( x(k) + n / x(k) )

Geometrically, x and n/x are the two sides of a rectangle of area n. Averaging them makes the
rectangle less lopsided each step, and the limit is the square with side √n. Convergence is
quadratic: the number of correct digits roughly doubles per iteration, so six steps from x₀ = 1
already pin √2 to full double precision.

Open `index.html` over http (the gallery links to it) and step through the iterations, or use
"Run all" to watch the rectangle collapse onto the dashed target square.
